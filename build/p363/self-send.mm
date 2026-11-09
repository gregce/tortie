// Phase 363 PROBE-ONLY helper: sends one event to THIS process and waits for the
// reply on a worker thread (the main thread stays free to serve the handler).
// Not shipped; the production addon has no send API.
#import <Foundation/Foundation.h>
#import <ApplicationServices/ApplicationServices.h>
#include <node_api.h>
#include <string>
#include <thread>
struct R { std::string text; int32_t code; };
static void Cb(napi_env e, napi_value cb, void *, void *data) {
  R *r = (R *)data;
  if (e && cb) { napi_value a[2], u, o; napi_get_undefined(e, &u);
    napi_create_string_utf8(e, r->text.c_str(), r->text.size(), &a[0]); napi_create_int32(e, r->code, &a[1]);
    napi_call_function(e, u, cb, 2, a, &o); }
  delete r;
}
static OSType Code(const std::string &s) { return (OSType)(((uint32_t)(uint8_t)s[0] << 24) | ((uint8_t)s[1] << 16) | ((uint8_t)s[2] << 8) | (uint8_t)s[3]); }
// send(classCode, idCode, kind, text|int, cb(text, code)); kind "text" or "int"
static napi_value Send(napi_env env, napi_callback_info info) {
  napi_value argv[5]; size_t n = 5; napi_get_cb_info(env, info, &n, argv, nullptr, nullptr);
  auto str = [&](napi_value v) { size_t l = 0; napi_get_value_string_utf8(env, v, nullptr, 0, &l);
    std::string s(l + 1, '\0'); napi_get_value_string_utf8(env, v, &s[0], l + 1, &l); s.resize(l); return s; };
  std::string cls = str(argv[0]), ev = str(argv[1]), kind = str(argv[2]), text = str(argv[3]);
  napi_value name; napi_create_string_utf8(env, "selfsend", NAPI_AUTO_LENGTH, &name);
  napi_threadsafe_function done;
  napi_create_threadsafe_function(env, argv[4], nullptr, name, 0, 1, nullptr, nullptr, nullptr, Cb, &done);
  std::thread([=]() {
    @autoreleasepool {
      pid_t me = getpid();
      NSAppleEventDescriptor *target = [NSAppleEventDescriptor descriptorWithDescriptorType:typeKernelProcessID bytes:&me length:sizeof(me)];
      NSAppleEventDescriptor *e = [NSAppleEventDescriptor appleEventWithEventClass:Code(cls) eventID:Code(ev) targetDescriptor:target returnID:kAutoGenerateReturnID transactionID:kAnyTransactionID];
      NSAppleEventDescriptor *p = kind == "int" ? [NSAppleEventDescriptor descriptorWithInt32:atoi(text.c_str())]
        : [NSAppleEventDescriptor descriptorWithString:[NSString stringWithUTF8String:text.c_str()]];
      [e setParamDescriptor:p forKeyword:keyDirectObject];
      AppleEvent reply = {typeNull, nullptr};
      OSStatus st = AESendMessage([e aeDesc], &reply, kAEWaitReply | kAENeverInteract, 10 * 60);
      R *r = new R{"", (int32_t)st};
      if (st == noErr) {
        NSAppleEventDescriptor *rd = [[NSAppleEventDescriptor alloc] initWithAEDescNoCopy:&reply];
        NSAppleEventDescriptor *en = [rd paramDescriptorForKeyword:keyErrorNumber];
        NSString *s = [[rd paramDescriptorForKeyword:keyDirectObject] stringValue];
        if (!s) s = [[rd paramDescriptorForKeyword:keyErrorString] stringValue];
        r->text = s ? [s UTF8String] : "";
        r->code = en ? (int32_t)[en int32Value] : 0;
      }
      napi_call_threadsafe_function(done, r, napi_tsfn_blocking);
      napi_release_threadsafe_function(done, napi_tsfn_release);
    }
  }).detach();
  napi_value v; napi_get_undefined(env, &v); return v;
}
static napi_value Init(napi_env env, napi_value exports) {
  napi_value fn; napi_create_function(env, "send", NAPI_AUTO_LENGTH, Send, nullptr, &fn);
  napi_set_named_property(env, exports, "send", fn); return exports;
}
NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
