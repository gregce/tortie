// Phase 363: Tortie's Apple Events transport. First-party, no dependencies.
//
// TEXT IN, TEXT OUT. Two synchronous events (submit request, request result)
// over a bounded job table. It reads no app state, no files, spawns nothing,
// runs no script and logs nothing. All work happens in JS through ONE
// non-blocking callback; the reply to an event never waits on JS.
#import <Foundation/Foundation.h>
#import <ApplicationServices/ApplicationServices.h>
#include <node_api.h>
#include <string>
#include <unordered_map>
#include <time.h>

static const AEEventClass kClass = 'TrtE';
static const AEEventID kSubmit = 'subm';
static const AEEventID kResult = 'rslt';
// Agree with AGENT_ACCESS_MAX_REQUEST_BYTES / _RESPONSE_BYTES in src/shared.
static const size_t kRequestCap = 64 * 1024, kResponseCap = 256 * 1024;
static const size_t kMaxJobs = 16;
static const double kDefaultTtlSeconds = 60.0;

struct Job { bool done; std::string response; double expires; };
static std::unordered_map<std::string, Job> jobs;
static napi_threadsafe_function dispatchFn;
static bool installed = false, shuttingDown = false;
static double ttlSeconds = kDefaultTtlSeconds;

struct Call { std::string id, text; };

static double Now() {
  struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t);
  return (double)t.tv_sec + (double)t.tv_nsec / 1e9;
}
static void Purge() {
  double n = Now();
  for (auto it = jobs.begin(); it != jobs.end();) {
    if (it->second.expires <= n) it = jobs.erase(it); else ++it;
  }
}
static void Fail(NSAppleEventDescriptor *reply, int32_t code, NSString *why) {
  [reply setParamDescriptor:[NSAppleEventDescriptor descriptorWithInt32:code] forKeyword:keyErrorNumber];
  [reply setParamDescriptor:[NSAppleEventDescriptor descriptorWithString:why] forKeyword:keyErrorString];
}
static void Answer(NSAppleEventDescriptor *reply, const std::string &s) {
  NSString *str = [[NSString alloc] initWithBytes:s.data() length:s.size() encoding:NSUTF8StringEncoding];
  [reply setParamDescriptor:[NSAppleEventDescriptor descriptorWithString:str ?: @""] forKeyword:keyDirectObject];
}
// Validated UTF-8 text from the direct parameter, or nil with `why` set.
static NSData *TextOf(NSAppleEventDescriptor *event, NSString **why) {
  NSAppleEventDescriptor *d = [event paramDescriptorForKeyword:keyDirectObject];
  DescType t = [d descriptorType];
  if (!d || (t != typeUnicodeText && t != typeUTF8Text && t != typeChar)) { *why = @"expected text"; return nil; }
  NSString *s = [d stringValue];
  NSData *b = s ? [s dataUsingEncoding:NSUTF8StringEncoding] : nil;
  if (!b) { *why = @"expected text"; return nil; }
  if ([b length] == 0 || [b length] > kRequestCap) { *why = @"request size"; return nil; }
  if (memchr([b bytes], 0, [b length])) { *why = @"NUL byte"; return nil; }
  return b;
}

static std::string NewId() {
  static const char hex[] = "0123456789abcdef";
  std::string id;
  for (int i = 0; i < 4; i++) { uint32_t r = arc4random(); for (int j = 0; j < 8; j++) { id += hex[r & 15]; r >>= 4; } }
  return id;
}

@interface TrtRecv : NSObject
- (void)submit:(NSAppleEventDescriptor *)event reply:(NSAppleEventDescriptor *)reply;
- (void)result:(NSAppleEventDescriptor *)event reply:(NSAppleEventDescriptor *)reply;
@end
@implementation TrtRecv
- (void)submit:(NSAppleEventDescriptor *)event reply:(NSAppleEventDescriptor *)reply {
  NSString *why = nil;
  if (shuttingDown || !installed) { Fail(reply, errAEEventNotHandled, @"shutting down"); return; }
  NSData *b = TextOf(event, &why);
  if (!b) { Fail(reply, errAEWrongDataType, why); return; }
  Purge();
  if (jobs.size() >= kMaxJobs) { Fail(reply, errAETimeout, @"too many requests"); return; }
  std::string id = NewId();
  Call *c = new Call{id, std::string((const char *)[b bytes], [b length])};
  if (napi_call_threadsafe_function(dispatchFn, c, napi_tsfn_nonblocking) != napi_ok) {
    delete c; Fail(reply, errAEEventNotHandled, @"dispatch refused"); return;
  }
  jobs[id] = Job{false, "", Now() + ttlSeconds};
  Answer(reply, id);
}
- (void)result:(NSAppleEventDescriptor *)event reply:(NSAppleEventDescriptor *)reply {
  NSString *why = nil;
  if (shuttingDown || !installed) { Fail(reply, errAEEventNotHandled, @"shutting down"); return; }
  NSAppleEventDescriptor *d = [event paramDescriptorForKeyword:keyDirectObject];
  DescType t = [d descriptorType];
  if (!d || (t != typeUnicodeText && t != typeUTF8Text && t != typeChar)) { Fail(reply, errAEWrongDataType, @"expected text"); return; }
  Purge();
  NSData *b = [[d stringValue] dataUsingEncoding:NSUTF8StringEncoding];
  std::string id = b && [b length] <= 128 ? std::string((const char *)[b bytes], [b length]) : std::string();
  auto it = jobs.find(id);
  if (it == jobs.end()) Answer(reply, "{\"state\":\"missing\"}");
  else if (!it->second.done) Answer(reply, "{\"state\":\"pending\"}");
  else Answer(reply, "{\"state\":\"completed\",\"response\":" + it->second.response + "}");
  (void)why;
}
@end
static TrtRecv *gRecv;

static void CallJs(napi_env env, napi_value cb, void *, void *data) {
  Call *c = (Call *)data;
  if (env && cb && installed && !shuttingDown && jobs.count(c->id)) {
    napi_value args[2], undef, r;
    napi_create_string_utf8(env, c->id.c_str(), c->id.size(), &args[0]);
    napi_create_string_utf8(env, c->text.c_str(), c->text.size(), &args[1]);
    napi_get_undefined(env, &undef);
    if (napi_call_function(env, undef, cb, 2, args, &r) != napi_ok) {
      napi_value ex; napi_get_and_clear_last_exception(env, &ex);
      jobs.erase(c->id);  // a handler that threw leaves a missing result, never a stuck pending
    }
  }
  delete c;
}

static void ShutdownAll() { shuttingDown = true; jobs.clear(); }
static void Cleanup(void *) {
  if (!installed) return;
  ShutdownAll();
  [[NSAppleEventManager sharedAppleEventManager] removeEventHandlerForEventClass:kClass andEventID:kSubmit];
  [[NSAppleEventManager sharedAppleEventManager] removeEventHandlerForEventClass:kClass andEventID:kResult];
  gRecv = nil; installed = false;
  napi_release_threadsafe_function(dispatchFn, napi_tsfn_abort);
}

static std::string Utf8(napi_env env, napi_value v, bool *ok) {
  size_t len = 0; *ok = false;
  if (napi_get_value_string_utf8(env, v, nullptr, 0, &len) != napi_ok) return "";
  std::string s(len + 1, '\0');
  if (napi_get_value_string_utf8(env, v, &s[0], len + 1, &len) != napi_ok) return "";
  s.resize(len); *ok = true; return s;
}
static napi_value Bool(napi_env env, bool b) { napi_value v; napi_get_boolean(env, b, &v); return v; }

// install(callback(id, text), ttlMs?) -> true
static napi_value Install(napi_env env, napi_callback_info info) {
  napi_value argv[2]; size_t n = 2;
  napi_get_cb_info(env, info, &n, argv, nullptr, nullptr);
  if (![NSThread isMainThread] || n < 1) { napi_throw_error(env, nullptr, "main thread + callback required"); return nullptr; }
  if (n > 1) { double ms; if (napi_get_value_double(env, argv[1], &ms) == napi_ok && ms > 0 && ms <= 600000) ttlSeconds = ms / 1000.0; }
  if (!installed) {
    shuttingDown = false; jobs.clear();
    napi_value name; napi_create_string_utf8(env, "tortie-apple-events", NAPI_AUTO_LENGTH, &name);
    if (napi_create_threadsafe_function(env, argv[0], nullptr, name, 0, 1, nullptr, nullptr, nullptr, CallJs, &dispatchFn) != napi_ok) {
      napi_throw_error(env, nullptr, "tsfn"); return nullptr; }
    napi_unref_threadsafe_function(env, dispatchFn);
    gRecv = [TrtRecv new];
    NSAppleEventManager *m = [NSAppleEventManager sharedAppleEventManager];
    [m setEventHandler:gRecv andSelector:@selector(submit:reply:) forEventClass:kClass andEventID:kSubmit];
    [m setEventHandler:gRecv andSelector:@selector(result:reply:) forEventClass:kClass andEventID:kResult];
    napi_add_env_cleanup_hook(env, Cleanup, nullptr);
    installed = true;
  }
  return Bool(env, true);
}
// isLive(id) -> true while the job exists, is not done and has not expired.
static napi_value IsLive(napi_env env, napi_callback_info info) {
  napi_value argv[1]; size_t n = 1; napi_get_cb_info(env, info, &n, argv, nullptr, nullptr);
  bool ok; std::string id = n == 1 ? Utf8(env, argv[0], &ok) : ""; Purge();
  auto it = jobs.find(id);
  return Bool(env, installed && !shuttingDown && it != jobs.end() && !it->second.done);
}
// complete(id, responseText) -> true only for a live pending job; late completion is ignored.
static napi_value Complete(napi_env env, napi_callback_info info) {
  napi_value argv[2]; size_t n = 2; napi_get_cb_info(env, info, &n, argv, nullptr, nullptr);
  if (n != 2) return Bool(env, false);
  bool ok1, ok2; std::string id = Utf8(env, argv[0], &ok1), text = Utf8(env, argv[1], &ok2);
  Purge();
  auto it = jobs.find(id);
  if (!ok1 || !ok2 || !installed || shuttingDown || it == jobs.end() || it->second.done) return Bool(env, false);
  if (text.empty() || text.size() > kResponseCap) { jobs.erase(it); return Bool(env, false); }
  it->second.done = true; it->second.response = text;
  return Bool(env, true);
}
static napi_value Shutdown(napi_env env, napi_callback_info) {
  Cleanup(nullptr); napi_value v; napi_get_undefined(env, &v); return v;
}
static napi_value JobCount(napi_env env, napi_callback_info) {
  Purge(); napi_value v; napi_create_uint32(env, (uint32_t)jobs.size(), &v); return v;
}

static napi_value Init(napi_env env, napi_value exports) {
  struct { const char *n; napi_callback f; } fns[] = {{"install", Install}, {"isLive", IsLive},
    {"complete", Complete}, {"shutdown", Shutdown}, {"jobCount", JobCount}};
  for (auto &f : fns) { napi_value fn; napi_create_function(env, f.n, NAPI_AUTO_LENGTH, f.f, nullptr, &fn); napi_set_named_property(env, exports, f.n, fn); }
  return exports;
}
NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
