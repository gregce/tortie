/*
** ==========================================================================
** Tortie's page-cache checker.
**
** Phase 364, "a diagnostic Tortie he runs as his everyday app":
** build/p364/SPEC.md §4.1 (this file, its build and its self-test), §4.5
** (the plant) and the decisions D1, D2, D4, D5, D6, D8 and D10. What it
** measures is research 143 §2.2, §2.3 and §5; research 144 §6 says the build
** goes ahead unchanged.
**
** WHERE IT CAME FROM. Research 143's checker (adv-churn/tools/
** pcache-check-append.c) went with Phase 357.1's scratch and no copy survived
** (build/p362/SPEC.md §0.1 item 7). The Phase 364 spec step rebuilt it from
** research 143's words and build/p357/probe-p357.mjs's interface, and measured
** that it reproduces research 143 §2.3 in Electron 43.8.7's main process
** (SPEC §0.1 items 1 to 5). This file is that checker, kept in the tree so it
** cannot be lost again.
**
** HOW IT IS BUILT (D1). build/diagnostic/build-checker.mjs appends this file
** to a COPY of better-sqlite3 13.0.3's amalgamation (SQLite 3.53.4), never to
** the file in node_modules, so it compiles in SQLite's own translation unit
** and reads pcache1's private structures (PgHdr1, PCache1, PGroup). Four
** one-line breadcrumbs in the copy's C++ call p358adv_on_entry(): research
** 143's two (StatementIterator::Next, Database::CloseHandles) and two more
** (STATEMENT_START, which run, get and all share, and Database::JS_exec), so
** every JavaScript call into SQLite is an entry.
**
** WHAT IT DOES.
**  1. The guard (D2). 16 bytes, "tortie-guard-364", in front of every SQLite
**     allocation, from the default allocator underneath (PartitionAlloc in
**     Electron's main process). Installed by a constructor at load with
**     SQLITE_CONFIG_GETMALLOC then SQLITE_CONFIG_MALLOC, before any connection
**     opens; it never initialises SQLite. A 4,368-byte line asks for 4,384 and
**     stays in the 4,608-byte slot class (SPEC §0.1 item 2). A free or a
**     realloc checks the guard first.
**  2. The walk (D4). At an entry, the thread's connections (at most 64), each
**     attached database's cache: the LRU list oldest first (links point back,
**     owner, count), every hash chain (owner, chain, count), and every line on
**     either (page pointer, page number, guard, the pager's own record). Every
**     read through a pointer that came from memory asks tchkReadable() first.
**  3. The cadence (D5). ALWAYS at a close, where the crash happens and where a
**     fresh connection dies (SPEC §0.1 item 9); otherwise once a thread's next
**     walk is due, which each walk sets from its own END: TCHK_FLOOR_MS (25
**     ms) or TCHK_SHARE (20) times what it cost, whichever is longer, so walks
**     take at most one part in 21 of a thread's time (the fix round).
**  4. The one line (D6). On the FIRST failed check it writes one NDJSON line
**     in app.log's own envelope, synchronously, in one write(2) with O_APPEND,
**     with research 143 §5's reading of the guard and the header (D8), and
**     the allocator's fill for a freed slot (0xcd), which is what a free
**     leaves in Tortie's running main process (the fix round). A line of the
**     cache's bulk block is told by its ADDRESS, never by its header. Then it
**     stops walking. It never repairs, never writes the database, never
**     changes what SQLite or the allocator do next.
**
** IT NEVER FAULTS ON DAMAGE. tchkReadable() asks the kernel for the VM region
** (mach_vm_region, remembered per walk, up to TCHK_REGIONS of them in address
** order), so a wild link is a failed check.
**
** TWO VARIANTS, chosen at compile time (D10):
**  - DIAGNOSTIC (no TCHK_PLANT): the guard, the walk, the one line. Its one
**    environment variable is TORTIE_CHECKER, "<app.log path>\t<home>", read at
**    the first entry that finds it and removed at once (D7). No signal
**    handler, no plant, none of the test variant's variables or lines.
**  - TEST (TCHK_PLANT): also the plants, a fault report and probe-p357's line
**    formats, driven by environment variables named where that code begins
**    (below). Never shipped.
**
** THE ABLATIONS (the self-test, build/diagnostic/checker-selftest.mjs): each
** TCHK_ABLATE_<RULE> compiles out exactly one clause, and is a test build's
** alone: OWNER, LRU_LINK, HASH_CHAIN, COUNT, GUARD, PAGE_NUMBER, CLOSE_WALK,
** READABLE.
** ==========================================================================
*/
#if !defined(TCHK_PLANT) && (defined(TCHK_ABLATE_OWNER) || defined(TCHK_ABLATE_LRU_LINK) \
  || defined(TCHK_ABLATE_HASH_CHAIN) || defined(TCHK_ABLATE_COUNT) || defined(TCHK_ABLATE_GUARD) \
  || defined(TCHK_ABLATE_PAGE_NUMBER) || defined(TCHK_ABLATE_CLOSE_WALK) || defined(TCHK_ABLATE_READABLE))
# error "an ablation belongs to the test variant alone"
#endif

#include <stdio.h>
#include <stdarg.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <time.h>
#include <sys/time.h>
#include <dlfcn.h>
#if defined(__APPLE__)
# include <malloc/malloc.h>
# include <mach/mach.h>
# include <mach/mach_vm.h>
#endif
#ifdef TCHK_PLANT
# include <signal.h>
# if defined(__APPLE__)
#  include <sys/ucontext.h>
# endif
#endif

#define TCHK_VERSION "364.3"
#define TCHK_GUARD 16
#define TCHK_MAX_DB 64
/* The VM regions one walk remembers (the fix round, 2026-11-09). 48, which
** never evicted, made every lookup past the 48th a scan and a kernel call: a
** full default cache spans about 101 regions and walked in 8.9 ms, four of
** them beside the session list made a 1.1 ms digest take 21.7 s (lens B). */
#define TCHK_REGIONS 1024
#define TCHK_OUT_BYTES 16384
#define TCHK_STR_MAX 2048
/* No page cache holds 67 million lines: a count past this is damage. */
#define TCHK_MAX_COUNT (1u<<26)
#ifndef TCHK_FLOOR_MS
# define TCHK_FLOOR_MS 25.0
#endif
/* The walk's share of a thread (the fix round): the next walk waits at least
** this many times the last walk's own cost, counted from the END of the walk,
** so walks never take more than 1 part in 21 of a thread's time, however many
** lines they meet. Before it, the floor counted from a walk's START, and a
** walk longer than the floor made every entry walk. */
#define TCHK_SHARE 20.0
/* The byte PartitionAlloc fills a freed slot with in Electron's main process
** once the window is up, holding the slot back from reuse for a while
** (measured by both lenses and the fix round: guard and header 0xcd, 64 of 64
** frees; a bare app with no window leaves a free-list entry instead). */
#define TCHK_FREED_FILL 0xcd
#ifdef TCHK_PLANT
# define TCHK_VARIANT "test"
#else
# define TCHK_VARIANT "diagnostic"
#endif

/* "tortie-guard-364": neither zero nor a free-list entry (g0 ^ g1 != ~0). */
static const unsigned char tchkPattern[TCHK_GUARD] = {
  0x74,0x6f,0x72,0x74,0x69,0x65,0x2d,0x67,0x75,0x61,0x72,0x64,0x2d,0x33,0x36,0x34
};

static sqlite3_mem_methods tchkOrig;          /* the default allocator, wrapped */
static int tchkInstalled = 0;                 /* SQLITE_CONFIG_MALLOC took */
static int tchkReported = 0;                  /* atomic: the one line was claimed */
static int tchkArmed = 0;                     /* atomic: 0 not yet, 1 arming, 2 armed */
static char tchkLogPath[1024];
static char tchkHome[512];
static unsigned long long tchkWalks = 0;      /* atomic */
static unsigned long long tchkEntries = 0;    /* atomic */
static unsigned long long tchkLines = 0;      /* atomic: lines checked */
static double tchkStartMs = 0;

static __thread sqlite3 *tchkDbs[TCHK_MAX_DB];
static __thread int tchkNDb = 0;
static __thread double tchkNextWalkMs = -1e300;   /* the earliest this thread walks again (D5) */
static __thread int tchkInWalk = 0;

#ifdef TCHK_PLANT
/*
** THE TEST VARIANT'S INTERFACE (probe:p357's CS arms, probe:p364, the lenses,
** the self-test), research 143's names kept so those arms run on this build:
**   P358ADV_PLANT=<kind>     crash-state | zero-header | page-zero |
**                            foreign-free | zero-take | take-write |
**                            stray-write, the self-test's one-rule plants
**                            owner | lru-link | hash-chain | count |
**                            page-number | wild-link | wild-hash, and the fix
**                            round's freed-fill | fill-written | lru-garbage |
**                            bulk-guard
**   P358ADV_PLANT_AT=<n>     the plant goes in before check n (default 0)
**   P358ADV_PLANT_FILE=<s>   only a database whose file name contains s
**   P358ADV_PLANT_PAGE=<n>   that page, else the oldest line on the LRU
**   P358ADV_PLANT_READONLY=  1 a read-only connection only, 0 read-write only
**   P358ADV_STEP_EVERY=<n>   walk every n-th entry (default 1), no floor
**   P358ADV_FLOOR_MS=<ms>    a floor between walks (default none)
**   P358ADV_CLASS=1          report the guarded line's slot class
**   P358ADV_SEGV_EXIT=1      report a SIGSEGV, SIGBUS, SIGILL, SIGTRAP,
**                            SIGFPE or SIGABRT on one line, then _exit(139),
**                            before macOS writes a crash report
**   P358ADV_END_AFTER_PLANT=1  _exit(0) at the end of the planting entry
**                            (the self-test's ablation arms, so nothing in
**                            SQLite touches the damage first)
**   P358ADV_WALK_REPORT=<n>  one [p358adv-WALK] line for each of the first n
**                            walks: the lines it read, the regions it
**                            remembered and asked, and its cost (the fix
**                            round's measurement of the walk)
**   P358ADV_PLANT_BULK=1     for crash-state, zero-header and page-zero only:
**                            when the cache holds no line SQLite allocated on
**                            its own, take the oldest line of its bulk block
**                            (a cache of twenty lines or fewer lives in it,
**                            so probe:p364's M2b could plant in neither the
**                            overview store, the symbol index nor OpenCode's
**                            reader: lens B, the fix round)
** Every plant takes a line SQLite allocated on its own, never the bulk block,
** but for P358ADV_PLANT_BULK's fallback.
** The plant is made at an entry whether or not that entry walks, so the walk
** that finds it is the cadence's, never the plant's.
** Lines on stderr: [p358adv-ARMED], [p358adv-PLANT] <kind> at check <n>
** op=<op> cache=0x… line=0x… page=<n> file=<path>, [p358adv-VIOLATION]
** <check>: <detail> op=<op> check=<n> n=<k> line=0x… file=<path> cache=0x…
** (the first 1,000, then one in 1,000), [p358adv-TAKE], [p358adv-CLASS],
** [p358adv-END] and [p358adv-SEGV] signal <n> at address 0x…, pc 0x… =
** <frame>+0x<off> in <image>.
*/
static struct {
  int on;
  char kind[32];
  unsigned long long at;
  char file[512];
  unsigned long long stepEvery;
  double floorMs;
  unsigned page;
  int readonly;   /* -1 any connection; 1 only a read-only one; 0 only a read-write one */
  int segvExit;
  int endAfter;
  int done;
  int classReport;
  unsigned long long walkReport;
  int bulkOk;
} tchkPlant;
static void *tchkTakers[64];
static int tchkNTakers = 0;
static unsigned long long tchkViolations = 0; /* atomic */
static PCache1 tchkDecoy;                     /* the owner plant's other cache */
static __thread double tchkLastWalkMs = -1e300;
/*
** THE TAKE (zero-take, take-write), the fix round. Research 143 §5's zeros
** come from a freed slot taken back by a zero-filled block. In a bare app the
** slot is free at once and the take follows in the same entry, as before. In
** Tortie's running main process PartitionAlloc fills a freed slot with 0xcd
** and holds it back from reuse, so a take made at once lands elsewhere (lens
** B: 0 of 64). The take therefore waits, on the planting thread, until the
** slot shows a free-list entry (it has left the hold), and that thread's walks
** wait with it, so no walk reads the slot before the take; it gives up after
** TCHK_TAKE_WAIT entries or TCHK_TAKE_TRIES takes that land elsewhere, and its
** [p358adv-TAKE] line says same-slot=0 then.
*/
# define TCHK_TAKE_WAIT 200000
# define TCHK_TAKE_TRIES 16
static struct {
  int pending;
  int zero;                 /* 1 calloc, 0 malloc then write */
  unsigned char *slot;
  unsigned long long waited;
  int tries;
} tchkTake;
static __thread int tchkTakeHere = 0;          /* this thread made the plant */
/* An address inside __PAGEZERO: never readable in a 64-bit macOS process. */
# define TCHK_WILD ((uintptr_t)0x20000000)
#endif

static double tchkMonoMs(void){
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return (double)ts.tv_sec*1000.0 + (double)ts.tv_nsec/1e6;
}

/* ---------------------------------------------------------------------------
** The guard allocator (D2).
** ------------------------------------------------------------------------- */
static void tchkReportBlock(const unsigned char *slot, const char *check, const char *entry);

static void *tchkMalloc(int n){
  unsigned char *p = (unsigned char*)tchkOrig.xMalloc(n + TCHK_GUARD);
  if( p==0 ) return 0;
  memcpy(p, tchkPattern, TCHK_GUARD);
  return p + TCHK_GUARD;
}
static void tchkFree(void *p){
  unsigned char *s;
  if( p==0 ) return;
  s = (unsigned char*)p - TCHK_GUARD;
  if( memcmp(s, tchkPattern, TCHK_GUARD)!=0 ) tchkReportBlock(s, "guard-at-free", "free");
  tchkOrig.xFree(s);
}
static void *tchkRealloc(void *p, int n){
  unsigned char *s, *q;
  if( p==0 ) return tchkMalloc(n);
  s = (unsigned char*)p - TCHK_GUARD;
  if( memcmp(s, tchkPattern, TCHK_GUARD)!=0 ) tchkReportBlock(s, "guard-at-realloc", "realloc");
  q = (unsigned char*)tchkOrig.xRealloc(s, n + TCHK_GUARD);
  if( q==0 ) return 0;
  return q + TCHK_GUARD;
}
static int tchkSize(void *p){
  if( p==0 ) return 0;
  return tchkOrig.xSize((unsigned char*)p - TCHK_GUARD) - TCHK_GUARD;
}
static int tchkRoundup(int n){ return tchkOrig.xRoundup(n); }
static int tchkInit(void *pAppData){ (void)pAppData; return tchkOrig.xInit(tchkOrig.pAppData); }
static void tchkShutdown(void *pAppData){ (void)pAppData; tchkOrig.xShutdown(tchkOrig.pAppData); }

#ifdef TCHK_PLANT
static void tchkSegv(int sig, siginfo_t *si, void *uc);
#endif

/* Runs at load, before any connection opens. It never initialises SQLite, so
** better-sqlite3's own ConfigureURI still runs before that, as today. */
__attribute__((constructor)) static void tchkInstall(void){
  sqlite3_mem_methods m;
  tchkStartMs = tchkMonoMs();
  if( sqlite3_config(SQLITE_CONFIG_GETMALLOC, &tchkOrig)!=SQLITE_OK ) return;
  if( tchkOrig.xMalloc==0 ) return;
  memset(&m, 0, sizeof(m));
  m.xMalloc = tchkMalloc;
  m.xFree = tchkFree;
  m.xRealloc = tchkRealloc;
  m.xSize = tchkSize;
  m.xRoundup = tchkRoundup;
  m.xInit = tchkInit;
  m.xShutdown = tchkShutdown;
  m.pAppData = 0;
  if( sqlite3_config(SQLITE_CONFIG_MALLOC, &m)==SQLITE_OK ) tchkInstalled = 1;
#ifdef TCHK_PLANT
  {
    const char *v;
    memset(&tchkPlant, 0, sizeof(tchkPlant));
    tchkPlant.stepEvery = 1;
    tchkPlant.readonly = -1;
    if( (v = getenv("P358ADV_PLANT_READONLY"))!=0 && (v[0]=='0' || v[0]=='1') ) tchkPlant.readonly = v[0]-'0';
    if( (v = getenv("P358ADV_PLANT"))!=0 && v[0] ){
      tchkPlant.on = 1;
      snprintf(tchkPlant.kind, sizeof(tchkPlant.kind), "%s", v);
    }
    if( (v = getenv("P358ADV_PLANT_AT"))!=0 ) tchkPlant.at = strtoull(v, 0, 10);
    if( (v = getenv("P358ADV_PLANT_FILE"))!=0 ) snprintf(tchkPlant.file, sizeof(tchkPlant.file), "%s", v);
    if( (v = getenv("P358ADV_PLANT_PAGE"))!=0 ) tchkPlant.page = (unsigned)strtoul(v, 0, 10);
    if( (v = getenv("P358ADV_STEP_EVERY"))!=0 && strtoull(v, 0, 10)>0 ) tchkPlant.stepEvery = strtoull(v, 0, 10);
    if( (v = getenv("P358ADV_FLOOR_MS"))!=0 ) tchkPlant.floorMs = strtod(v, 0);
    if( (v = getenv("P358ADV_CLASS"))!=0 && v[0]=='1' ) tchkPlant.classReport = 1;
    if( (v = getenv("P358ADV_END_AFTER_PLANT"))!=0 && v[0]=='1' ) tchkPlant.endAfter = 1;
    if( (v = getenv("P358ADV_WALK_REPORT"))!=0 ) tchkPlant.walkReport = strtoull(v, 0, 10);
    if( (v = getenv("P358ADV_PLANT_BULK"))!=0 && v[0]=='1' ) tchkPlant.bulkOk = 1;
    if( (v = getenv("P358ADV_SEGV_EXIT"))!=0 && v[0]=='1' ){
      /* Every fatal signal a damaged heap can raise: a deliberate fault in a
      ** test run never reaches his crash reports folder. */
      static const int sigs[] = { SIGSEGV, SIGBUS, SIGILL, SIGTRAP, SIGFPE, SIGABRT };
      struct sigaction sa;
      size_t i;
      memset(&sa, 0, sizeof(sa));
      sa.sa_sigaction = tchkSegv;
      sa.sa_flags = SA_SIGINFO | SA_RESETHAND;
      sigemptyset(&sa.sa_mask);
      for(i=0; i<sizeof(sigs)/sizeof(sigs[0]); i++) sigaction(sigs[i], &sa, 0);
      tchkPlant.segvExit = 1;
    }
    {
      char line[320];
      int n = snprintf(line, sizeof(line),
                       "[p358adv-ARMED] checker %s guard=%d installed=%d plant=%s at=%llu step=%llu floor=%g end=%d segv=%d\n",
                       TCHK_VERSION, TCHK_GUARD, tchkInstalled, tchkPlant.on ? tchkPlant.kind : "none",
                       tchkPlant.at, tchkPlant.stepEvery, tchkPlant.floorMs, tchkPlant.endAfter, tchkPlant.segvExit);
      if( n>0 ) (void)!write(2, line, (size_t)(n < (int)sizeof(line) ? n : (int)sizeof(line)-1));
    }
  }
#endif
}

/* ---------------------------------------------------------------------------
** Reading memory that might not be there.
** ------------------------------------------------------------------------- */
typedef struct { uintptr_t lo, hi; int ok; } TchkRegion;
/*
** The regions one walk has asked the kernel about (the fix round). `ord`
** keeps them sorted by start, so a lookup is a binary search; once full, the
** oldest is replaced, so a walk that meets more regions than this still asks
** the kernel at most once per region it has lost, never once per read.
*/
typedef struct {
  TchkRegion r[TCHK_REGIONS];
  unsigned short ord[TCHK_REGIONS];
  int n, last, next;
  unsigned asks;                      /* the kernel's answers this walk */
} TchkRegions;

static void tchkRegionsReset(TchkRegions *rc){ rc->n = 0; rc->last = 0; rc->next = 0; rc->asks = 0; }

/* The first place in `ord` whose region starts above `a`. */
static int tchkOrdAbove(const TchkRegions *rc, uintptr_t a){
  int lo = 0, hi = rc->n;
  while( lo<hi ){
    int mid = (lo + hi)>>1;
    if( rc->r[rc->ord[mid]].lo<=a ) lo = mid + 1; else hi = mid;
  }
  return lo;
}

static void tchkRegionAt(TchkRegions *rc, uintptr_t a, TchkRegion *out){
  int i, k;
  if( rc->n>0 && a>=rc->r[rc->last].lo && a<rc->r[rc->last].hi ){ *out = rc->r[rc->last]; return; }
  k = tchkOrdAbove(rc, a);
  if( k>0 ){
    i = rc->ord[k-1];
    if( a<rc->r[i].hi ){ rc->last = i; *out = rc->r[i]; return; }
  }
#if defined(__APPLE__)
  {
    mach_vm_address_t addr = (mach_vm_address_t)a;
    mach_vm_size_t size = 0;
    vm_region_basic_info_data_64_t info;
    mach_msg_type_number_t cnt = VM_REGION_BASIC_INFO_COUNT_64;
    mach_port_t obj = MACH_PORT_NULL;
    kern_return_t kr = mach_vm_region(mach_task_self(), &addr, &size, VM_REGION_BASIC_INFO_64,
                                      (vm_region_info_t)&info, &cnt, &obj);
    if( obj!=MACH_PORT_NULL ) mach_port_deallocate(mach_task_self(), obj);
    if( kr==KERN_SUCCESS && (uintptr_t)addr<=a && a<(uintptr_t)(addr+size) ){
      out->lo = (uintptr_t)addr; out->hi = (uintptr_t)(addr+size);
      out->ok = (info.protection & VM_PROT_READ)!=0;
    }else{
      out->lo = a & ~(uintptr_t)0x3fff; out->hi = out->lo + 0x4000; out->ok = 0;
    }
  }
#else
  out->lo = a & ~(uintptr_t)0xfff; out->hi = out->lo + 0x1000; out->ok = 1;
#endif
  rc->asks++;
  /* Remember it: a free slot, else the oldest, taken out of the order first. */
  if( rc->n<TCHK_REGIONS ){
    i = rc->n;
  }else{
    int p;
    i = rc->next;
    rc->next = (rc->next + 1) % TCHK_REGIONS;
    for(p=0; p<rc->n && rc->ord[p]!=i; p++){}
    if( p<rc->n ){
      memmove(&rc->ord[p], &rc->ord[p+1], (size_t)(rc->n - 1 - p)*sizeof(rc->ord[0]));
      rc->n--;
    }
  }
  rc->r[i] = *out;
  k = tchkOrdAbove(rc, out->lo);
  memmove(&rc->ord[k+1], &rc->ord[k], (size_t)(rc->n - k)*sizeof(rc->ord[0]));
  rc->ord[k] = (unsigned short)i;
  rc->n++;
  rc->last = i;
}

/* True when [p, p+len) can be read without a fault. */
static int tchkReadable(TchkRegions *rc, const void *p, size_t len){
  uintptr_t a = (uintptr_t)p, b = a + len;
  if( a<0x10000 || b<a || b>(uintptr_t)0x0000800000000000ULL ) return 0;
#ifdef TCHK_ABLATE_READABLE
  /* The ablation: the kernel is never asked. */
  (void)rc;
  return 1;
#else
  {
    uintptr_t cur = a;
    while( cur<b ){
      TchkRegion r;
      tchkRegionAt(rc, cur, &r);
      if( !r.ok || r.hi<=cur ) return 0;
      cur = r.hi;
    }
  }
  return 1;
#endif
}

/* ---------------------------------------------------------------------------
** The one line (D6).
** ------------------------------------------------------------------------- */
typedef struct {
  char buf[TCHK_OUT_BYTES];
  int n;
} TchkOut;
static TchkOut tchkLineOut;   /* written only by the caller that claimed the one line */
static TchkOut tchkArmOut;    /* written only by the caller that armed */

/* Appends, always leaving room for the newline and the NUL. */
static void tchkPut(TchkOut *o, const char *s){
  size_t k = strlen(s);
  size_t room = sizeof(o->buf) - 2 - (size_t)o->n;
  if( k>room ) k = room;
  memcpy(o->buf + o->n, s, k);
  o->n += (int)k;
  o->buf[o->n] = 0;
}
static void tchkPutf(TchkOut *o, const char *fmt, ...){
  char tmp[1024];
  va_list ap;
  va_start(ap, fmt);
  vsnprintf(tmp, sizeof(tmp), fmt, ap);
  va_end(ap);
  tchkPut(o, tmp);
}
/* The home folder app.log's redaction shortens to "~" (src/main/log/redact.ts:
** every occurrence, no separator needed, never for "" or "/"), once armed. */
static size_t tchkHomeLen(void){
  if( __atomic_load_n(&tchkArmed, __ATOMIC_ACQUIRE)!=2 ) return 0;
  return strlen(tchkHome);
}
/* A JSON string, redacted as app.log's own lines are. */
static void tchkPutStr(TchkOut *o, const char *s){
  char tmp[8];
  size_t hl = tchkHomeLen();
  int k = 0;
  tchkPut(o, "\"");
  if( s!=0 ){
    while( *s && k<TCHK_STR_MAX ){
      unsigned char c = (unsigned char)*s;
      if( hl>1 && strncmp(s, tchkHome, hl)==0 ){ tchkPut(o, "~"); s += hl; k++; continue; }
      if( c=='"' || c=='\\' ){ tmp[0]='\\'; tmp[1]=(char)c; tmp[2]=0; tchkPut(o, tmp); }
      else if( c<0x20 ){ snprintf(tmp, sizeof(tmp), "\\u%04x", c); tchkPut(o, tmp); }
      else { tmp[0]=(char)c; tmp[1]=0; tchkPut(o, tmp); }
      s++; k++;
    }
  }
  tchkPut(o, "\"");
}
/* Hex of [p, p+len), or null when it cannot be read. */
static void tchkPutHex(TchkOut *o, TchkRegions *rc, const void *p, size_t len){
  static const char hx[] = "0123456789abcdef";
  char tmp[3];
  size_t i;
  if( p==0 || len==0 || !tchkReadable(rc, p, len) ){ tchkPut(o, "null"); return; }
  tchkPut(o, "\"");
  for(i=0; i<len; i++){
    unsigned char c = ((const unsigned char*)p)[i];
    tmp[0] = hx[c>>4]; tmp[1] = hx[c&15]; tmp[2] = 0;
    tchkPut(o, tmp);
  }
  tchkPut(o, "\"");
}
static void tchkPutPtr(TchkOut *o, const void *p){
  if( p==0 ) tchkPut(o, "null");
  else tchkPutf(o, "\"0x%llx\"", (unsigned long long)(uintptr_t)p);
}
static void tchkIsoNow(char *out, size_t n){
  struct timeval tv;
  struct tm tm;
  time_t t;
  gettimeofday(&tv, 0);
  t = tv.tv_sec;
  gmtime_r(&t, &tm);
  snprintf(out, n, "%04d-%02d-%02dT%02d:%02d:%02d.%03dZ", tm.tm_year+1900, tm.tm_mon+1, tm.tm_mday,
           tm.tm_hour, tm.tm_min, tm.tm_sec, (int)(tv.tv_usec/1000));
}

/* Research 143 §5's three readings (D8), and the allocator's own fill for a
** freed slot, which is what a free leaves in Tortie's running main process
** (the fix round): the fill in the guard and the header while the allocator
** holds the slot back, a free-list entry in the guard once it lets the slot go,
** and the fill still in the header after a new owner wrote over the start. */
#define TCHK_READ_FREE  "a free-list entry in the guard: freed by code outside SQLite"
#define TCHK_READ_FILL  "the allocator's fill for freed memory (0xcd) in the guard and the header: freed by code outside SQLite"
#define TCHK_READ_FILL_WRITTEN "the allocator's fill for freed memory (0xcd) in the header and other bytes in the guard: freed by code outside SQLite, then written over"
#define TCHK_READ_ZEROS "zeros in the guard and the header: freed, then taken by a zero-filled block"
#define TCHK_READ_STRAY "something else wrote here: a stray write"

/* True when all `n` bytes at p are `b` (p already readable). */
static int tchkAll(const unsigned char *p, size_t n, unsigned char b){
  size_t i;
  for(i=0; i<n; i++) if( p[i]!=b ) return 0;
  return 1;
}

/* `bulk` means a line from SQLite's own bulk block, which has no guard, and is
** decided by the line's ADDRESS (never by its header, which may be the damage);
** `hdr` 0 means a block with no header (a guard at a free or a realloc, or the
** cache's bulk block itself). */
static const char *tchkReading(TchkRegions *rc, const unsigned char *guard, const unsigned char *hdr, size_t hlen, int bulk){
  unsigned long long g0, g1;
  int hOk, gWhole;
  if( bulk ){
    if( hdr!=0 && tchkReadable(rc, hdr, hlen) ){
      if( tchkAll(hdr, hlen, 0) ) return "zeros in the header of a line from SQLite's bulk block, which has no guard";
      if( tchkAll(hdr, hlen, TCHK_FREED_FILL) ) return "the allocator's fill for freed memory (0xcd) in the header of a line from SQLite's bulk block, which has no guard";
    }
    return TCHK_READ_STRAY " (a line from SQLite's bulk block, which has no guard)";
  }
  if( guard==0 || !tchkReadable(rc, guard, TCHK_GUARD) ) return "the guard cannot be read";
  memcpy(&g0, guard, 8); memcpy(&g1, guard+8, 8);
  gWhole = memcmp(guard, tchkPattern, TCHK_GUARD)==0;
  if( !gWhole && (g0 ^ g1)==~0ULL ) return TCHK_READ_FREE;
  hOk = hdr!=0 && tchkReadable(rc, hdr, hlen);
  if( tchkAll(guard, TCHK_GUARD, TCHK_FREED_FILL) ){
    if( hdr==0 ) return "the allocator's fill for freed memory (0xcd) in the guard: freed by code outside SQLite";
    if( hOk && tchkAll(hdr, hlen, TCHK_FREED_FILL) ) return TCHK_READ_FILL;
  }
  if( tchkAll(guard, TCHK_GUARD, 0) ){
    if( hOk && tchkAll(hdr, hlen, 0) ) return TCHK_READ_ZEROS;
    if( hdr==0 ) return "zeros in the guard";
  }
  /* The fill stays in the header, past the 4,096 bytes a new owner of the
  ** slot class writes, so the slot was freed whatever wrote over the guard. */
  if( !gWhole && hOk && tchkAll(hdr, hlen, TCHK_FREED_FILL) ) return TCHK_READ_FILL_WRITTEN;
  return TCHK_READ_STRAY;
}
/* Every 8-byte word that names a library (dladdr) or a heap (its malloc zone). */
static void tchkPutWords(TchkOut *o, TchkRegions *rc, const unsigned char *p, size_t len){
  size_t i;
  int first = 1;
  tchkPut(o, "[");
  if( p!=0 && tchkReadable(rc, p, len) ){
    for(i=0; i+8<=len; i+=8){
      unsigned long long w;
      Dl_info di;
      char tmp[512];
      memcpy(&w, p+i, 8);
      if( w<0x10000 || w>=0x0000800000000000ULL ) continue;
      memset(&di, 0, sizeof(di));
      if( dladdr((const void*)(uintptr_t)w, &di) && di.dli_fname ){
        const char *base = strrchr(di.dli_fname, '/');
        snprintf(tmp, sizeof(tmp), "0x%llx: %s%s%s", (unsigned long long)i, base ? base+1 : di.dli_fname,
                 di.dli_sname ? "!" : "", di.dli_sname ? di.dli_sname : "");
        if( !first ) tchkPut(o, ",");
        tchkPutStr(o, tmp);
        first = 0;
        continue;
      }
#if defined(__APPLE__)
      {
        malloc_zone_t *z = malloc_zone_from_ptr((const void*)(uintptr_t)w);
        if( z ){
          snprintf(tmp, sizeof(tmp), "0x%llx: heap %s", (unsigned long long)i, z->zone_name ? z->zone_name : "(unnamed)");
          if( !first ) tchkPut(o, ",");
          tchkPutStr(o, tmp);
          first = 0;
        }
      }
#endif
    }
  }
  tchkPut(o, "]");
}
/* The line, its newline, one write(2), O_APPEND (D6); stderr before arming. */
static void tchkEmit(TchkOut *o){
  int fd = -1;
  o->buf[o->n++] = '\n';
  o->buf[o->n] = 0;
  if( __atomic_load_n(&tchkArmed, __ATOMIC_ACQUIRE)==2 && tchkLogPath[0] ){
    fd = open(tchkLogPath, O_WRONLY|O_APPEND|O_CREAT|O_CLOEXEC, 0600);
  }
  if( fd>=0 ){
    (void)!write(fd, o->buf, (size_t)o->n);
    close(fd);
  }else{
    (void)!write(2, o->buf, (size_t)o->n);
  }
}
/* app.log's envelope (src/main/log/format.ts): ts, level, scope, pid, proctype, event, msg. */
static void tchkEnvelope(TchkOut *o, const char *level, const char *event, const char *msg){
  char ts[40];
  tchkIsoNow(ts, sizeof(ts));
  o->n = 0; o->buf[0] = 0;
  tchkPutf(o, "{\"ts\":\"%s\",\"level\":\"%s\",\"scope\":\"diagnostic\",\"pid\":%d,\"proctype\":\"main\",\"event\":\"%s\",\"msg\":",
           ts, level, (int)getpid(), event);
  tchkPutStr(o, msg);
}
static void tchkTail(TchkOut *o){
  tchkPutf(o, ",\"walks\":%llu,\"lines\":%llu,\"sinceLoadMs\":%.0f,\"checker\":\"%s\",\"guard\":%d}",
           __atomic_load_n(&tchkWalks, __ATOMIC_RELAXED), __atomic_load_n(&tchkLines, __ATOMIC_RELAXED),
           tchkMonoMs() - tchkStartMs, TCHK_VERSION, TCHK_GUARD);
}

typedef struct {
  const char *check;
  char detail[160];
  const PgHdr1 *hdr;        /* the line's header, or 0 for the cache itself */
  int szPage;               /* 0 when the cache could not be read */
  const void *cache;
  const unsigned char *bulkLo, *bulkHi;  /* the cache's bulk block, by address; 0 when none */
  const unsigned char *block;            /* the bulk block's slot, when ITS guard failed */
  sqlite3 *db;
  const char *zSchema;
  const char *op;
} TchkFail;

/* Claim the one report. Returns 1 for the caller that may write it. */
static int tchkClaim(void){
  int expect = 0;
  return __atomic_compare_exchange_n(&tchkReported, &expect, 1, 0, __ATOMIC_SEQ_CST, __ATOMIC_SEQ_CST);
}

/* The guard at a free or a realloc, or the guard of a cache's bulk block: no
** header and no page line, only the block. The walk passes its database,
** schema, cache and entry; a free or a realloc has none of them. */
static void tchkReportBlockAt(TchkRegions *rc, const unsigned char *slot, const char *check, const char *detail,
                              const char *entry, sqlite3 *db, const char *zSchema, const void *cache){
  TchkOut *o = &tchkLineOut;
  const char *file = 0;
  int size = -1;
  /* Asked of the allocator only for a block it handed out and that is still
  ** mapped: the free's and the realloc's own block, or a bulk block the walk
  ** has read the guard of. */
  if( tchkReadable(rc, slot, TCHK_GUARD) ) size = tchkOrig.xSize((void*)(uintptr_t)slot) - TCHK_GUARD;
  if( db ) file = sqlite3_db_filename(db, zSchema ? zSchema : "main");
  tchkEnvelope(o, "error", "diagnostic.pcache", "A SQLite allocation failed its check");
  tchkPut(o, ",\"check\":"); tchkPutStr(o, check);
  tchkPut(o, ",\"detail\":"); tchkPutStr(o, detail);
  tchkPut(o, ",\"reading\":"); tchkPutStr(o, tchkReading(rc, slot, 0, 0, 0));
  tchkPut(o, ",\"line\":"); tchkPutPtr(o, slot + TCHK_GUARD);
  tchkPut(o, ",\"header\":null,\"guardBytes\":"); tchkPutHex(o, rc, slot, TCHK_GUARD);
  tchkPut(o, ",\"headerBytes\":null,\"pageBytes\":"); tchkPutHex(o, rc, slot + TCHK_GUARD, size>0 ? (size<64 ? (size_t)size : 64) : 0);
  tchkPut(o, ",\"pageNumber\":null,\"pagerPageNumber\":null,\"bulk\":false,\"words\":");
  tchkPutWords(o, rc, slot, TCHK_GUARD);
  tchkPut(o, ",\"database\":"); tchkPutStr(o, file ? file : "");
  tchkPut(o, ",\"schema\":"); tchkPutStr(o, db ? (zSchema ? zSchema : "main") : "");
  tchkPut(o, ",\"cache\":"); tchkPutPtr(o, cache);
  tchkPut(o, ",\"entry\":"); tchkPutStr(o, entry);
  tchkPutf(o, ",\"size\":%d", size);
  tchkTail(o);
  tchkEmit(o);
}

/* The page line's report: every D6 field, null where it cannot be read. */
static void tchkReportLine(TchkRegions *rc, const TchkFail *f){
  TchkOut *o = &tchkLineOut;
  const PgHdr1 *h = f->hdr;
  const unsigned char *hdr = (const unsigned char*)h;
  const unsigned char *line = 0, *guard = 0;
  const char *file = 0;
  char detail[sizeof(f->detail) + 96];
  unsigned iKey = 0;
  long long pgno = -1;
  int bulk = 0, hdrOk = 0, claim = -1;
  if( f->block!=0 ){
    tchkReportBlockAt(rc, f->block, f->check, f->detail, f->op, f->db, f->zSchema, f->cache);
    return;
  }
  if( h!=0 && f->szPage>0 ){
    /* pcache1's slot: the page bytes, then the 56-byte header (sqlite3.c:58141-58143). */
    line = hdr - f->szPage;
    /* From the bulk block by WHERE the line is, never by what its header says. */
    bulk = f->bulkLo!=0 && line>=f->bulkLo && line<f->bulkHi;
    if( tchkReadable(rc, h, sizeof(PgHdr1)) ){
      const PgHdr *ph = (const PgHdr*)(hdr + ROUND8(sizeof(PgHdr1)));
      hdrOk = 1;
      iKey = h->iKey;
      claim = h->isBulkLocal!=0;
      if( tchkReadable(rc, ph, sizeof(PgHdr)) ) pgno = (long long)ph->pgno;
    }
    if( !bulk ) guard = line - TCHK_GUARD;
  }
  /* What the header claims, said when it is not where the line is. */
  snprintf(detail, sizeof(detail), "%s%s", f->detail,
           claim==1 && !bulk ? "; its header says it is a line of the bulk block, which its address is not"
           : claim==0 && bulk ? "; its header says it was allocated on its own, which its address says it was not" : "");
  if( f->db ) file = sqlite3_db_filename(f->db, f->zSchema ? f->zSchema : "main");
  tchkEnvelope(o, "error", "diagnostic.pcache", "A SQLite page line failed its check");
  tchkPut(o, ",\"check\":"); tchkPutStr(o, f->check);
  tchkPut(o, ",\"detail\":"); tchkPutStr(o, detail);
  tchkPut(o, ",\"reading\":"); tchkPutStr(o, h ? tchkReading(rc, guard, hdr, sizeof(PgHdr1), bulk) : "no line: the cache itself");
  tchkPut(o, ",\"line\":"); tchkPutPtr(o, line);
  tchkPut(o, ",\"header\":"); tchkPutPtr(o, hdr);
  tchkPut(o, ",\"guardBytes\":"); tchkPutHex(o, rc, guard, TCHK_GUARD);
  tchkPut(o, ",\"headerBytes\":"); tchkPutHex(o, rc, hdr, sizeof(PgHdr1));
  tchkPut(o, ",\"pageBytes\":"); tchkPutHex(o, rc, line, 64);
  if( hdrOk ) tchkPutf(o, ",\"pageNumber\":%u", iKey); else tchkPut(o, ",\"pageNumber\":null");
  if( pgno>=0 ) tchkPutf(o, ",\"pagerPageNumber\":%lld", pgno); else tchkPut(o, ",\"pagerPageNumber\":null");
  tchkPutf(o, ",\"bulk\":%s", bulk ? "true" : "false");
  tchkPut(o, ",\"words\":");
  {
    unsigned char both[TCHK_GUARD + sizeof(PgHdr1)];
    memset(both, 0, sizeof(both));
    if( guard && tchkReadable(rc, guard, TCHK_GUARD) ) memcpy(both, guard, TCHK_GUARD);
    if( hdrOk ) memcpy(both + TCHK_GUARD, hdr, sizeof(PgHdr1));
    tchkPutWords(o, rc, both, sizeof(both));
  }
  tchkPut(o, ",\"database\":"); tchkPutStr(o, file ? file : "");
  tchkPut(o, ",\"schema\":"); tchkPutStr(o, f->zSchema ? f->zSchema : "main");
  tchkPut(o, ",\"cache\":"); tchkPutPtr(o, f->cache);
  tchkPut(o, ",\"entry\":"); tchkPutStr(o, f->op);
  tchkTail(o);
  tchkEmit(o);
}

/* The guard at a free or a realloc: no header and no page, only the block. */
static void tchkReportBlock(const unsigned char *slot, const char *check, const char *entry){
  TchkRegions rc;
  tchkRegionsReset(&rc);
#ifdef TCHK_PLANT
  {
    char line[512];
    unsigned long long k = __atomic_add_fetch(&tchkViolations, 1, __ATOMIC_RELAXED);
    int n = snprintf(line, sizeof(line), "[p358adv-VIOLATION] %s: the guard changed op=%s check=%llu n=%llu line=0x%llx file=- cache=0x0\n",
                     check, entry, __atomic_load_n(&tchkWalks, __ATOMIC_RELAXED), k,
                     (unsigned long long)(uintptr_t)(slot + TCHK_GUARD));
    if( n>0 && (k<=1000 || (k % 1000)==0) ) (void)!write(2, line, (size_t)(n < (int)sizeof(line) ? n : (int)sizeof(line)-1));
  }
#endif
  if( !tchkClaim() ) return;
  tchkReportBlockAt(&rc, slot, check, "the guard changed before SQLite let go of the block", entry, 0, 0, 0);
}

/* ---------------------------------------------------------------------------
** The page-cache check (D4). Each TCHK_ABLATE_<RULE> compiles out one clause.
** ------------------------------------------------------------------------- */
#define TCHK_FAIL(F, CHECK, HDR, ...) do{ (F)->check = (CHECK); (F)->hdr = (HDR); \
  snprintf((F)->detail, sizeof((F)->detail), __VA_ARGS__); return 1; }while(0)

/* One line: its owner, page pointer, guard, the pager's record and its page number. */
static int tchkCheckLine(TchkRegions *rc, const PCache1 *c, int szPage, const PgHdr1 *p, TchkFail *f){
  const unsigned char *line;
  const PgHdr *ph;
  if( !tchkReadable(rc, p, sizeof(PgHdr1)) ) TCHK_FAIL(f, "header", 0, "a line's header cannot be read");
  __atomic_add_fetch(&tchkLines, 1, __ATOMIC_RELAXED);
#ifndef TCHK_ABLATE_OWNER
  if( p->pCache!=c ) TCHK_FAIL(f, "owner", p, "the line's owner is not this cache");
#endif
  line = (const unsigned char*)p - szPage;
  if( (const unsigned char*)p->page.pBuf!=line ) TCHK_FAIL(f, "header", p, "the header's page pointer does not point back at its line");
  if( (const unsigned char*)p->page.pExtra!=(const unsigned char*)p + ROUND8(sizeof(PgHdr1)) ) TCHK_FAIL(f, "header", p, "the header's extra pointer moved");
  /* A line of the bulk block has no guard; which lines those are is read from
  ** the bulk block's address, never from the header's own flag (the fix round). */
  if( !(f->bulkLo!=0 && line>=f->bulkLo && line<f->bulkHi) ){
    if( !tchkReadable(rc, line - TCHK_GUARD, TCHK_GUARD) ) TCHK_FAIL(f, "guard", p, "the guard cannot be read");
#ifndef TCHK_ABLATE_GUARD
    if( memcmp(line - TCHK_GUARD, tchkPattern, TCHK_GUARD)!=0 ) TCHK_FAIL(f, "guard", p, "the guard changed");
#endif
  }
  ph = (const PgHdr*)((const unsigned char*)p + ROUND8(sizeof(PgHdr1)));
  if( !tchkReadable(rc, ph, sizeof(PgHdr)) ) TCHK_FAIL(f, "header", p, "the pager's record cannot be read");
  if( ph->pPage!=0 && ph->pPage!=&p->page ) TCHK_FAIL(f, "header", p, "the pager's record names another line");
#ifndef TCHK_ABLATE_PAGE_NUMBER
  if( p->iKey==0 || (ph->pPage!=0 && ph->pgno!=p->iKey) ){
    TCHK_FAIL(f, "page-number", p, "page %u in the header, %u in the pager's record", p->iKey,
              ph->pPage!=0 ? (unsigned)ph->pgno : 0u);
  }
#endif
  return 0;
}

/* 1 when p sits on one of the cache's hash chains, which is where every line
** the cache holds sits (pcache1's LRU list holds a subset of it). Read only
** when a link fails, to tell which side of it is the damage. */
static int tchkInHash(TchkRegions *rc, const PCache1 *c, const PgHdr1 *p){
  PgHdr1 *const *ap;
  const PgHdr1 *q;
  unsigned h, nHash, nPage, steps = 0;
  if( !tchkReadable(rc, c, sizeof(PCache1)) ) return 0;
  nHash = c->nHash;
  nPage = c->nPage;
  ap = c->apHash;
  if( nHash==0 || nHash>TCHK_MAX_COUNT || nPage>TCHK_MAX_COUNT ) return 0;
  if( !tchkReadable(rc, ap, sizeof(PgHdr1*)*(size_t)nHash) ) return 0;
  for(h=0; h<nHash; h++){
    q = ap[h];
    while( q!=0 ){
      if( q==p ) return 1;
      if( ++steps > nPage + 8 || !tchkReadable(rc, q, sizeof(PgHdr1)) ) break;
      q = q->pNext;
    }
  }
  return 0;
}

/* One cache. Returns 1 and fills f on the first failed check. */
static int tchkWalkCache(TchkRegions *rc, const PCache1 *c, TchkFail *f){
  const PGroup *g;
  const PgHdr1 *anchor, *prev, *p;
  PgHdr1 *const *ap;
  const unsigned char *bulk;
  unsigned n = 0, h, inHash = 0, nHash, nPage, nRecyclable;
  int szPage, szAlloc, lruWalked = 0;
  f->cache = c;
  f->hdr = 0;
  f->szPage = 0;
  f->bulkLo = f->bulkHi = 0;
  f->block = 0;
  if( !tchkReadable(rc, c, sizeof(PCache1)) ) TCHK_FAIL(f, "cache", 0, "the cache cannot be read");
  szPage = c->szPage;
  szAlloc = c->szAlloc;
  nHash = c->nHash;
  nPage = c->nPage;
  nRecyclable = c->nRecyclable;
  bulk = (const unsigned char*)c->pBulk;
  if( szPage<512 || szPage>65536 || szAlloc<=szPage
   || nHash>TCHK_MAX_COUNT || nPage>TCHK_MAX_COUNT || nRecyclable>TCHK_MAX_COUNT ){
    TCHK_FAIL(f, "cache", 0, "the cache's sizes are not a page cache's");
  }
  f->szPage = szPage;
  g = c->pGroup;
  if( !tchkReadable(rc, g, sizeof(PGroup)) ) TCHK_FAIL(f, "cache", 0, "the cache's group cannot be read");
  /* The bulk block (pcache1InitBulk, sqlite3.c:57981): one allocation of
  ** SQLite's, so it carries a guard, and its lines carry none. Its extent is
  ** what SQLite measured it by (sqlite3MallocSize, tchkSize here), asked of the
  ** allocator only once the block's own guard reads whole; a line is from it
  ** by its address, never by its header's flag (the fix round: a damaged
  ** header claimed it, and the guard that held the answer went unread). */
  if( bulk!=0 ){
    int sz;
    f->block = bulk - TCHK_GUARD;
    if( !tchkReadable(rc, bulk - TCHK_GUARD, TCHK_GUARD) ) TCHK_FAIL(f, "guard", 0, "the guard of the cache's bulk block cannot be read");
#ifndef TCHK_ABLATE_GUARD
    if( memcmp(bulk - TCHK_GUARD, tchkPattern, TCHK_GUARD)!=0 ) TCHK_FAIL(f, "guard", 0, "the guard of the cache's bulk block changed");
#endif
    sz = tchkOrig.xSize((void*)(uintptr_t)(bulk - TCHK_GUARD)) - TCHK_GUARD;
    if( sz<szAlloc ) TCHK_FAIL(f, "guard", 0, "the cache's bulk block is smaller than one line (%d bytes)", sz);
    f->block = 0;
    f->bulkLo = bulk;
    f->bulkHi = bulk + sz;
  }
  anchor = &g->lru;
  /* The LRU list, oldest first, the way the close takes it (pcache1EnforceMaxPage). */
  if( pcache1.separateCache ){
    lruWalked = 1;
    prev = anchor;
    p = g->lru.pLruPrev;
    while( p!=anchor ){
      if( p==0 ) TCHK_FAIL(f, "lru", prev==anchor ? 0 : prev, "a link of the list is empty");
      if( !tchkReadable(rc, p, sizeof(PgHdr1)) ){
        TCHK_FAIL(f, "lru", prev==anchor ? 0 : prev, "a link points outside readable memory, at 0x%llx", (unsigned long long)(uintptr_t)p);
      }
#ifndef TCHK_ABLATE_LRU_LINK
      if( p->pLruNext!=prev ){
        /* Which side is the damage: p's own back link, or the link that led to
        ** p. A line the cache holds sits on a hash chain; anything else is
        ** memory a bad link points at, and the line holding that link is the
        ** one reported (lens B: the garbage itself was reported before). */
        if( !tchkInHash(rc, c, p) ){
          TCHK_FAIL(f, "lru", prev==anchor ? 0 : prev, "a link points at 0x%llx, which is not a line of this cache", (unsigned long long)(uintptr_t)p);
        }
        TCHK_FAIL(f, "lru", p, "a link does not point back");
      }
#endif
      if( p->isAnchor ) TCHK_FAIL(f, "lru", p, "a second anchor");
      if( tchkCheckLine(rc, c, szPage, p, f) ) return 1;
      if( ++n > nRecyclable + 1 ) TCHK_FAIL(f, "lru", p, "the list is longer than its count");
      prev = p;
      p = p->pLruPrev;
    }
  }
  /* The hash: every chain, every line in it. */
  if( nHash>0 ){
    ap = c->apHash;
    if( !tchkReadable(rc, ap, sizeof(PgHdr1*)*(size_t)nHash) ) TCHK_FAIL(f, "hash", 0, "the hash table cannot be read");
    for(h=0; h<nHash; h++){
      const PgHdr1 *q = 0;
      p = ap[h];
      while( p ){
        if( !tchkReadable(rc, p, sizeof(PgHdr1)) ){
          TCHK_FAIL(f, "hash", q, "a chain points outside readable memory, at 0x%llx (chain %u)", (unsigned long long)(uintptr_t)p, h);
        }
#ifndef TCHK_ABLATE_HASH_CHAIN
        if( p->iKey % nHash != h ) TCHK_FAIL(f, "hash", p, "page %u sits in chain %u", p->iKey, h);
#endif
        if( tchkCheckLine(rc, c, szPage, p, f) ) return 1;
        if( ++inHash > nPage + 8 ) TCHK_FAIL(f, "hash", p, "the chains hold more lines than the count");
        q = p;
        p = p->pNext;
      }
    }
  }
#ifndef TCHK_ABLATE_COUNT
  if( (lruWalked && n!=nRecyclable) || inHash!=nPage ){
    TCHK_FAIL(f, "count", 0, "the list holds %u lines for a count of %u; the chains hold %u for a count of %u",
              n, nRecyclable, inHash, nPage);
  }
#endif
  return 0;
}

static PCache1 *tchkCacheOf(TchkRegions *rc, const Btree *pBt){
  const BtShared *bs;
  const Pager *pg;
  const PCache *pc;
  if( pBt==0 || !tchkReadable(rc, pBt, sizeof(Btree)) ) return 0;
  bs = pBt->pBt;
  if( bs==0 || !tchkReadable(rc, bs, sizeof(BtShared)) ) return 0;
  pg = bs->pPager;
  if( pg==0 || !tchkReadable(rc, pg, sizeof(Pager)) ) return 0;
  pc = pg->pPCache;
  if( pc==0 || !tchkReadable(rc, pc, sizeof(PCache)) ) return 0;
  return (PCache1*)pc->pCache;
}

#ifdef TCHK_PLANT
static void tchkSay(const char *fmt, ...){
  char line[1024];
  int n;
  va_list ap;
  va_start(ap, fmt);
  n = vsnprintf(line, sizeof(line), fmt, ap);
  va_end(ap);
  if( n>0 ) (void)!write(2, line, (size_t)(n < (int)sizeof(line) ? n : (int)sizeof(line)-1));
}
/* 1 when a healthy cache's line is one of its bulk block's, by its address (the
** walk's own rule). The plants and the class report run on healthy caches. */
static int tchkInBulk(const PCache1 *c, const PgHdr1 *p){
  const unsigned char *b = (const unsigned char*)c->pBulk;
  const unsigned char *line = (const unsigned char*)p - c->szPage;
  int sz;
  if( b==0 ) return 0;
  sz = tchkOrig.xSize((void*)(uintptr_t)(b - TCHK_GUARD)) - TCHK_GUARD;
  return line>=b && line<b + sz;
}
/* The line to plant in: page P358ADV_PLANT_PAGE when set, else the oldest line
** on the LRU, the one the close takes first. Allocated lines only (`needAllocated`). */
static PgHdr1 *tchkPlantTarget(TchkRegions *rc, PCache1 *c, int needAllocated){
  PGroup *g;
  PgHdr1 *anchor, *p;
  unsigned steps = 0;
  if( !tchkReadable(rc, c, sizeof(PCache1)) ) return 0;
  g = c->pGroup;
  if( !tchkReadable(rc, g, sizeof(PGroup)) ) return 0;
  if( tchkPlant.page ){
    PgHdr1 **ap = c->apHash;
    unsigned nHash = c->nHash;
    if( nHash==0 || nHash>TCHK_MAX_COUNT || !tchkReadable(rc, ap, sizeof(PgHdr1*)*(size_t)nHash) ) return 0;
    p = ap[tchkPlant.page % nHash];
    while( p && steps++<1000000 ){
      if( !tchkReadable(rc, p, sizeof(PgHdr1)) ) return 0;
      if( p->iKey==tchkPlant.page && (!needAllocated || !tchkInBulk(c, p)) ) return p;
      p = p->pNext;
    }
    return 0;
  }
  anchor = &g->lru;
  p = g->lru.pLruPrev;
  while( p && p!=anchor && steps++<TCHK_MAX_COUNT ){
    if( !tchkReadable(rc, p, sizeof(PgHdr1)) ) return 0;
    if( !needAllocated || !tchkInBulk(c, p) ) return p;
    p = p->pLruPrev;
  }
  return 0;
}
/* The deferred take (above, tchkTake): 1 once it is done or given up, 0 while
** its slot is still held back. Only the planting thread asks. */
static int tchkTryTake(TchkRegions *rc){
  unsigned char *slot = tchkTake.slot;
  unsigned long long g0 = 0, g1 = 0;
  void *q;
  int held = 1;
  if( tchkReadable(rc, slot, TCHK_GUARD) ){
    memcpy(&g0, slot, 8);
    memcpy(&g1, slot + 8, 8);
    held = (g0 ^ g1)!=~0ULL;
  }
  if( held ){
    if( ++tchkTake.waited < TCHK_TAKE_WAIT ) return 0;
    tchkSay("[p358adv-TAKE] %s same-slot=0 taker=0x0 slot=0x%llx waited=%llu tries=%d gave-up\n", tchkTake.zero ? "zero-take" : "take-write",
            (unsigned long long)(uintptr_t)slot, tchkTake.waited, tchkTake.tries);
    tchkTake.pending = 0;
    return 1;
  }
  q = tchkTake.zero ? calloc(1, 4096) : malloc(4096);
  if( q && !tchkTake.zero ) memset(q, 0xa5, 4096);
  if( tchkNTakers<64 ) tchkTakers[tchkNTakers++] = q;
  tchkTake.tries++;
  if( q!=(void*)slot && tchkTake.tries<TCHK_TAKE_TRIES ) return 0;
  tchkSay("[p358adv-TAKE] %s same-slot=%d taker=0x%llx slot=0x%llx waited=%llu tries=%d\n", tchkTake.zero ? "zero-take" : "take-write",
          q==(void*)slot, (unsigned long long)(uintptr_t)q, (unsigned long long)(uintptr_t)slot, tchkTake.waited, tchkTake.tries);
  tchkTake.pending = 0;
  return 1;
}
/* Takes p out of its hash chain. Returns 1 when it was there. */
static int tchkHashUnlink(TchkRegions *rc, PCache1 *c, PgHdr1 *p){
  PgHdr1 **pp, *q;
  unsigned nHash;
  if( !tchkReadable(rc, c, sizeof(PCache1)) || !tchkReadable(rc, p, sizeof(PgHdr1)) ) return 0;
  nHash = c->nHash;
  if( nHash==0 || nHash>TCHK_MAX_COUNT ) return 0;
  pp = &c->apHash[p->iKey % nHash];
  while( (q = *pp)!=0 && q!=p ){
    if( !tchkReadable(rc, q, sizeof(PgHdr1)) ) return 0;
    pp = &q->pNext;
  }
  if( q==0 ) return 0;
  *pp = p->pNext;
  return 1;
}
/* Returns 1 when the plant was made in this cache. `checkNo` is the walk it precedes. */
static int tchkPlantIn(TchkRegions *rc, PCache1 *c, const char *op, const char *file, unsigned long long checkNo){
  PgHdr1 *p;
  unsigned char *line, *slot;
  unsigned key;
  int szPage;
  const char *k = tchkPlant.kind;
  if( tchkPlant.file[0] && (file==0 || strstr(file, tchkPlant.file)==0) ) return 0;
  if( !tchkReadable(rc, c, sizeof(PCache1)) || c->nPage<4 ) return 0;
  szPage = c->szPage;
  /* Every plant takes a line SQLite allocated on its own, as his two lines were
  ** (0x1200 apart, research 143 §2.1), never one from the bulk block, but for
  ** P358ADV_PLANT_BULK's fallback: a plant that leaves the guard alone, in a
  ** cache that holds no allocated line at all. */
  p = tchkPlantTarget(rc, c, 1);
  if( p==0 && tchkPlant.bulkOk
   && (strcmp(k, "crash-state")==0 || strcmp(k, "zero-header")==0 || strcmp(k, "page-zero")==0) ){
    p = tchkPlantTarget(rc, c, 0);
  }
  if( p==0 || !tchkReadable(rc, p, sizeof(PgHdr1)) ) return 0;
  line = (unsigned char*)p->page.pBuf;      /* read before any damage */
  key = p->iKey;
  slot = line - TCHK_GUARD;
  if( strcmp(k, "crash-state")==0 ){
    /* Research 143 §2.3 and 357.1's arm: the line leaves the hash and its owner reads 0. */
    if( p->pLruNext==0 || !tchkHashUnlink(rc, c, p) ) return 0;
    p->pCache = 0;
  }else if( strcmp(k, "zero-header")==0 ){
    /* The judge's zero-filled take, in place: the header's 56 bytes zeroed. */
    memset(p, 0, sizeof(PgHdr1));
  }else if( strcmp(k, "page-zero")==0 ){
    /* Damaged page content, the header intact (research 143 §2.3). */
    memset(line, 0, (size_t)szPage);
  }else if( strcmp(k, "foreign-free")==0 || strcmp(k, "zero-take")==0 || strcmp(k, "take-write")==0 ){
    /* Research 143 §5's shapes: the slot freed by code outside SQLite, then
    ** taken, once the allocator lets it go (tchkTryTake). */
    tchkOrig.xFree(slot);
    if( strcmp(k, "foreign-free")!=0 ){
      memset(&tchkTake, 0, sizeof(tchkTake));
      tchkTake.zero = strcmp(k, "zero-take")==0;
      tchkTake.slot = slot;
      tchkTake.pending = 1;
      tchkTakeHere = 1;
      (void)tchkTryTake(rc);
    }
  }else if( strcmp(k, "freed-fill")==0 ){
    /* The slot as PartitionAlloc leaves a freed one in Tortie's running main
    ** process: 0xcd over the guard, the page and the header, the slot itself
    ** not freed (plain node's allocator fills nothing; the fix round). */
    memset(slot, TCHK_FREED_FILL, (size_t)(TCHK_GUARD + c->szAlloc));
  }else if( strcmp(k, "fill-written")==0 ){
    /* The same freed slot, then taken by a 4,096-byte block that wrote all it
    ** asked for: its bytes over the guard and the page, the fill left in the
    ** header past 0x1000 (research 143 §2.2's malloc(4096) row, on the fill). */
    memset(slot, TCHK_FREED_FILL, (size_t)(TCHK_GUARD + c->szAlloc));
    memset(slot, 0xa5, 4096);
  }else if( strcmp(k, "lru-garbage")==0 ){
    /* The line's next-younger link points at readable memory that is not a
    ** line (the owner plant's other cache): the line holding the link is the
    ** one to report, not the memory it points at (lens B's nit). */
    if( p->pLruNext==0 ) return 0;
    p->pLruPrev = (PgHdr1*)(void*)&tchkDecoy;
  }else if( strcmp(k, "bulk-guard")==0 ){
    /* Two words over the guard of the cache's bulk block (the fix round). */
    unsigned long long w[2];
    unsigned char *b = (unsigned char*)c->pBulk;
    if( b==0 ) return 0;
    w[0] = (unsigned long long)(uintptr_t)(void*)&malloc_zone_malloc;
    w[1] = 0x00004b4c5542ULL;
    memcpy(b - TCHK_GUARD, w, sizeof(w));
    line = b;
  }else if( strcmp(k, "wild-hash")==0 ){
    /* The readable rule's second arm: the cache's hash table pointer points
    ** into __PAGEZERO (lens B: nothing showed the table's own check). */
    if( c->nHash==0 ) return 0;
    c->apHash = (PgHdr1**)TCHK_WILD;
  }else if( strcmp(k, "stray-write")==0 ){
    /* Two words written over the guard: a code pointer and a pattern. */
    unsigned long long w[2];
    w[0] = (unsigned long long)(uintptr_t)(void*)&malloc_zone_malloc;
    w[1] = 0x00005354524159ULL;
    memcpy(slot, w, sizeof(w));
  }else if( strcmp(k, "owner")==0 ){
    /* The owner rule's arm: another cache owns the line, nothing else moved. */
    p->pCache = &tchkDecoy;
  }else if( strcmp(k, "lru-link")==0 ){
    /* The LRU link rule's arm: the line's link no longer points back. */
    if( p->pLruNext==0 ) return 0;
    p->pLruNext = p;
  }else if( strcmp(k, "hash-chain")==0 ){
    /* The chain rule's arm: the line moves to the next chain, nothing else moved. */
    unsigned nHash = c->nHash, h2;
    PgHdr1 **ap = c->apHash;
    if( nHash<2 || nHash>TCHK_MAX_COUNT || !tchkReadable(rc, ap, sizeof(PgHdr1*)*(size_t)nHash) ) return 0;
    if( !tchkHashUnlink(rc, c, p) ) return 0;
    h2 = (key % nHash + 1) % nHash;
    p->pNext = ap[h2];
    ap[h2] = p;
  }else if( strcmp(k, "count")==0 ){
    /* The count rule's arm: the cache counts one line more than its chains hold. */
    c->nPage += 1;
  }else if( strcmp(k, "page-number")==0 ){
    /* The page-number rule's arm: the header names another page in the same chain. */
    if( c->nHash==0 ) return 0;
    p->iKey = key + c->nHash;
  }else if( strcmp(k, "wild-link")==0 ){
    /* The readable rule's arm: the line's next-younger link points into __PAGEZERO. */
    if( p->pLruNext==0 ) return 0;
    p->pLruPrev = (PgHdr1*)TCHK_WILD;
  }else{
    return 0;
  }
  tchkSay("[p358adv-PLANT] %s at check %llu op=%s cache=0x%llx line=0x%llx page=%u file=%s\n", k, checkNo, op,
          (unsigned long long)(uintptr_t)c, (unsigned long long)(uintptr_t)line, key, file && file[0] ? file : "-");
  return 1;
}
/* The plant pass, once due: at every entry the entry's own connection, and at
** an entry that walks every other one this thread holds too (the walk's own
** order), so a plant is never a walk's and costs a quiet entry one connection. */
static int tchkPlantPass(TchkRegions *rc, sqlite3 *db, const char *op, int all){
  sqlite3 *list[TCHK_MAX_DB + 1];
  int n = 0, i, j;
  unsigned long long checkNo;
  if( !tchkPlant.on || tchkPlant.done ) return 0;
  checkNo = __atomic_load_n(&tchkWalks, __ATOMIC_RELAXED) + 1;
  if( checkNo<tchkPlant.at ) return 0;
  list[n++] = db;
  if( all ) for(i=0; i<tchkNDb; i++) if( tchkDbs[i]!=db ) list[n++] = tchkDbs[i];
  for(j=0; j<n; j++){
    sqlite3 *d = list[j];
    int nDb;
    Db *aDb;
    if( d==0 || !tchkReadable(rc, d, sizeof(sqlite3)) ) continue;
    nDb = d->nDb;
    aDb = d->aDb;
    if( nDb<1 || nDb>125 || !tchkReadable(rc, aDb, sizeof(Db)*(size_t)nDb) ) continue;
    for(i=0; i<nDb; i++){
      PCache1 *c = tchkCacheOf(rc, aDb[i].pBt);
      const char *zSchema = aDb[i].zDbSName;
      if( c==0 ) continue;
      if( tchkPlant.readonly>=0 && sqlite3_db_readonly(d, zSchema)!=tchkPlant.readonly ) continue;
      if( tchkPlantIn(rc, c, op, sqlite3_db_filename(d, zSchema), checkNo) ){
        tchkPlant.done = 1;
        return 1;
      }
    }
  }
  return 0;
}
/* The class the guarded line lands in, measured in this process (SPEC §2.1). */
static void tchkClassReport(TchkRegions *rc, PCache1 *c){
  static int said = 0;
  PGroup *g;
  PgHdr1 *anchor, *p;
  int k = 0;
  uintptr_t last = 0;
  if( said || !tchkReadable(rc, c, sizeof(PCache1)) ) return;
  g = c->pGroup;
  if( !tchkReadable(rc, g, sizeof(PGroup)) ) return;
  anchor = &g->lru;
  p = g->lru.pLruPrev;
  while( p && p!=anchor && k<8 ){
    unsigned char *slot;
    if( !tchkReadable(rc, p, sizeof(PgHdr1)) ) return;
    if( !tchkInBulk(c, p) ){
      slot = (unsigned char*)p->page.pBuf - TCHK_GUARD;
#if defined(__APPLE__)
      {
        malloc_zone_t *z = malloc_zone_from_ptr(slot);
        tchkSay("[p358adv-CLASS] szAlloc=%d request=%d usable=%zu slot=0x%llx gap=%lld zone=%s\n", c->szAlloc,
                c->szAlloc + TCHK_GUARD, malloc_size(slot), (unsigned long long)(uintptr_t)slot,
                last ? (long long)((intptr_t)slot - (intptr_t)last) : 0LL, z && z->zone_name ? z->zone_name : "?");
      }
#endif
      last = (uintptr_t)slot;
      k++;
    }
    p = p->pLruPrev;
  }
  if( k ){
    /* The same sizes asked of the default allocator directly, one at a time. */
    static const int sizes[] = { 4096, 4104, 4368, 4384, 4600, 4601, 4608 };
    size_t i;
    said = 1;
    for(i=0; i<sizeof(sizes)/sizeof(sizes[0]); i++){
      void *a = malloc((size_t)sizes[i]);
      void *b = malloc((size_t)sizes[i]);
#if defined(__APPLE__)
      malloc_zone_t *z = a ? malloc_zone_from_ptr(a) : 0;
      tchkSay("[p358adv-CLASS] probe request=%d usable=%zu next-gap=%lld zone=%s\n", sizes[i], a ? malloc_size(a) : (size_t)0,
              (a && b) ? (long long)((intptr_t)b - (intptr_t)a) : 0LL, z && z->zone_name ? z->zone_name : "?");
#endif
      free(b);
      free(a);
    }
  }
}
#endif

/* Walk every cache of one connection. Returns 1 when it failed. */
static int tchkWalkDb(TchkRegions *rc, sqlite3 *db, const char *op, unsigned long long walk){
  int i, nDb;
  Db *aDb;
  TchkFail f;
  if( db==0 || !tchkReadable(rc, db, sizeof(sqlite3)) ) return 0;
  nDb = db->nDb;
  aDb = db->aDb;
  if( nDb<1 || nDb>125 || !tchkReadable(rc, aDb, sizeof(Db)*(size_t)nDb) ) return 0;
  for(i=0; i<nDb; i++){
    PCache1 *c = tchkCacheOf(rc, aDb[i].pBt);
    const char *zSchema = aDb[i].zDbSName;
    if( c==0 ) continue;
#ifdef TCHK_PLANT
    if( tchkPlant.classReport ) tchkClassReport(rc, c);
#endif
    memset(&f, 0, sizeof(f));
    if( tchkWalkCache(rc, c, &f) ){
      f.db = db;
      f.zSchema = zSchema;
      f.op = op;
#ifdef TCHK_PLANT
      {
        /* Every violation is counted; the first 1,000 are printed, then one in 1,000. */
        unsigned long long k = __atomic_add_fetch(&tchkViolations, 1, __ATOMIC_RELAXED);
        if( k<=1000 || (k % 1000)==0 ){
          const char *file = sqlite3_db_filename(db, zSchema);
          tchkSay("[p358adv-VIOLATION] %s: %s op=%s check=%llu n=%llu line=0x%llx file=%s cache=0x%llx\n", f.check, f.detail, op, walk, k,
                  (unsigned long long)(uintptr_t)(f.block ? f.block + TCHK_GUARD : f.hdr && f.szPage>0 ? (const unsigned char*)f.hdr - f.szPage : 0),
                  file && file[0] ? file : "-", (unsigned long long)(uintptr_t)c);
        }
      }
#endif
      if( tchkClaim() ) tchkReportLine(rc, &f);
      return 1;
    }
  }
  return 0;
}

static void tchkRemember(sqlite3 *db){
  int i;
  for(i=0; i<tchkNDb; i++) if( tchkDbs[i]==db ) return;
  if( tchkNDb<TCHK_MAX_DB ) tchkDbs[tchkNDb++] = db;
}
static void tchkForget(sqlite3 *db){
  int i;
  for(i=0; i<tchkNDb; i++){
    if( tchkDbs[i]==db ){ tchkDbs[i] = tchkDbs[--tchkNDb]; tchkDbs[tchkNDb] = 0; return; }
  }
}

/* The handshake's other half (D7): "<app.log path>\t<home folder>", read once,
** removed at once, and the armed line written by the C side itself. */
static void tchkArm(void){
  const char *v;
  int expect = 0;
  v = getenv("TORTIE_CHECKER");
  if( v==0 ) return;
  if( !__atomic_compare_exchange_n(&tchkArmed, &expect, 1, 0, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE) ) return;
  {
    const char *tab = strchr(v, '\t');
    size_t lp = tab ? (size_t)(tab - v) : strlen(v);
    if( lp>=sizeof(tchkLogPath) ) lp = sizeof(tchkLogPath)-1;
    memcpy(tchkLogPath, v, lp);
    tchkLogPath[lp] = 0;
    tchkHome[0] = 0;
    if( tab ) snprintf(tchkHome, sizeof(tchkHome), "%s", tab+1);
  }
  unsetenv("TORTIE_CHECKER");
  __atomic_store_n(&tchkArmed, 2, __ATOMIC_RELEASE);
  {
    TchkOut *o = &tchkArmOut;
    tchkEnvelope(o, "info", "diagnostic.armed", "The page-cache checker is on");
    tchkPutf(o, ",\"checker\":\"%s\",\"variant\":\"%s\",\"guard\":%d,\"installed\":%s,\"floorMs\":%.0f}",
             TCHK_VERSION, TCHK_VARIANT, TCHK_GUARD, tchkInstalled ? "true" : "false", (double)TCHK_FLOOR_MS);
    tchkEmit(o);
  }
}

/* Every JavaScript call into SQLite (D1). `db` or `stmt` names the connection. */
void p358adv_on_entry(const char *op, sqlite3 *db, sqlite3_stmt *stmt){
  unsigned long long e, walk;
  int closing, i, walkNow = 1;
  double now;
  TchkRegions rc;
#ifdef TCHK_PLANT
  int planted = 0;
#endif
  if( __atomic_load_n(&tchkArmed, __ATOMIC_ACQUIRE)==0 ) tchkArm();
  if( !tchkInstalled ) return;
  if( db==0 && stmt!=0 ) db = sqlite3_db_handle(stmt);
  if( db==0 ) return;
  closing = op!=0 && strcmp(op, "Database::close")==0;
#ifndef TCHK_PLANT
  /* The diagnostic build stops at its one line: no further cost. */
  if( __atomic_load_n(&tchkReported, __ATOMIC_RELAXED) ){
    if( closing ) tchkForget(db);
    return;
  }
#endif
  if( tchkInWalk ) return;
  e = __atomic_add_fetch(&tchkEntries, 1, __ATOMIC_RELAXED);
  if( !closing ) tchkRemember(db);
  tchkRegionsReset(&rc);
  /* The cadence (D5): ALWAYS at a close (SPEC §0.1 item 9: a fresh connection
  ** dies at its own close), else once the thread's next walk is due, which the
  ** last walk set from its own END: the floor, or TCHK_SHARE times what that
  ** walk cost, whichever is longer (the fix round). */
#ifndef TCHK_ABLATE_CLOSE_WALK
  if( !closing )
#endif
  {
#ifdef TCHK_PLANT
    if( (e % tchkPlant.stepEvery)!=0 ){
      walkNow = 0;
    }else if( tchkPlant.floorMs>0 ){
      now = tchkMonoMs();
      if( now - tchkLastWalkMs < tchkPlant.floorMs ) walkNow = 0;
      else tchkLastWalkMs = now;
    }
    /* A take waiting for its slot holds this thread's walks (tchkTake). */
    if( tchkTakeHere && tchkTake.pending && !tchkTryTake(&rc) ) walkNow = 0;
#else
    (void)e;
    if( tchkMonoMs() < tchkNextWalkMs ) walkNow = 0;
#endif
  }
#ifdef TCHK_PLANT
  planted = tchkPlantPass(&rc, db, op, walkNow && !closing);
  if( planted ){
    tchkRegionsReset(&rc);   /* a plant that frees may change what is mapped */
    if( tchkTakeHere && tchkTake.pending && !closing ) walkNow = 0;
  }
#endif
  if( walkNow ){
    double began = tchkMonoMs(), cost, gap;
#ifdef TCHK_PLANT
    unsigned long long linesBefore = __atomic_load_n(&tchkLines, __ATOMIC_RELAXED);
#endif
    tchkInWalk = 1;
    walk = __atomic_add_fetch(&tchkWalks, 1, __ATOMIC_RELAXED);
    /* The entry's own connection first; at a close, only that one. */
    if( !tchkWalkDb(&rc, db, op, walk) && !closing ){
      for(i=0; i<tchkNDb; i++){
        if( tchkDbs[i]!=db && tchkWalkDb(&rc, tchkDbs[i], op, walk) ) break;
      }
    }
    tchkInWalk = 0;
    now = tchkMonoMs();
    cost = now - began;
    gap = cost*TCHK_SHARE;
    if( gap<TCHK_FLOOR_MS ) gap = TCHK_FLOOR_MS;
    tchkNextWalkMs = now + gap;
#ifdef TCHK_PLANT
    if( tchkPlant.walkReport>0 ){
      tchkPlant.walkReport--;
      tchkSay("[p358adv-WALK] n=%llu op=%s lines=%llu regions=%d asks=%u us=%.1f\n", walk, op ? op : "-",
              __atomic_load_n(&tchkLines, __ATOMIC_RELAXED) - linesBefore, rc.n, rc.asks, cost*1000.0);
    }
#endif
  }
  if( closing ) tchkForget(db);
#ifdef TCHK_PLANT
  if( planted && tchkPlant.endAfter ){
    tchkSay("[p358adv-END] the plant's entry ended op=%s walked=%d violations=%llu reported=%d\n", op ? op : "-", walkNow,
            __atomic_load_n(&tchkViolations, __ATOMIC_RELAXED), __atomic_load_n(&tchkReported, __ATOMIC_RELAXED));
    _exit(0);
  }
#endif
}

#ifdef TCHK_PLANT
/* Research 143's crash line: the checker's own SIGSEGV report, then exit 139
** before any macOS report is written (probe-p357.mjs CRASH_SEGV_PARTS). The
** frame is dladdr's or this table's, whichever is nearer below the pc. */
static const struct { const char *name; void *addr; } tchkFrames[] = {
  { "pcache1EnforceMaxPage", (void*)pcache1EnforceMaxPage },
  { "pcache1TruncateUnsafe", (void*)pcache1TruncateUnsafe },
  { "pcache1RemoveFromHash", (void*)pcache1RemoveFromHash },
  { "pcache1PinPage", (void*)pcache1PinPage },
  { "pcache1FreePage", (void*)pcache1FreePage },
  { "pcache1Destroy", (void*)pcache1Destroy },
  { "pcache1Truncate", (void*)pcache1Truncate },
  { "pcache1FetchStage2", (void*)pcache1FetchStage2 },
  { "tchkWalkCache", (void*)tchkWalkCache },
  { "tchkCheckLine", (void*)tchkCheckLine },
  { "tchkWalkDb", (void*)tchkWalkDb },
};
static void tchkSegv(int sig, siginfo_t *si, void *ucv){
  char line[512];
  int n;
  uintptr_t pc = 0, best = 0;
  const char *name = "?";
  const char *image = "?";
  Dl_info di;
  size_t i;
#if defined(__APPLE__) && defined(__arm64__)
  ucontext_t *uc = (ucontext_t*)ucv;
  if( uc && uc->uc_mcontext ) pc = (uintptr_t)uc->uc_mcontext->__ss.__pc;
#else
  (void)ucv;
#endif
  memset(&di, 0, sizeof(di));
  if( pc && dladdr((void*)pc, &di) ){
    if( di.dli_sname ){ name = di.dli_sname; best = (uintptr_t)di.dli_saddr; }
    if( di.dli_fname ) image = di.dli_fname;
  }
  for(i=0; i<sizeof(tchkFrames)/sizeof(tchkFrames[0]); i++){
    uintptr_t a = (uintptr_t)tchkFrames[i].addr;
    if( a<=pc && a>best ){ best = a; name = tchkFrames[i].name; }
  }
  n = snprintf(line, sizeof(line), "[p358adv-SEGV] signal %d at address 0x%llx, pc 0x%llx = %s+0x%llx in %s\n", sig,
               (unsigned long long)(uintptr_t)si->si_addr, (unsigned long long)pc, name,
               (unsigned long long)(pc - best), image);
  if( n>0 ) (void)!write(2, line, (size_t)(n < (int)sizeof(line) ? n : (int)sizeof(line)-1));
  _exit(139);
}
#endif
/* ==== end of Tortie's page-cache checker ==== */
