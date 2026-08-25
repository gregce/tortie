/*
 * fsevents-cap.c — the measurement behind EXCLUSION_PATH_BUDGET (Phase 151).
 *
 * `FSEventStreamSetExclusionPaths` is DOCUMENTED as accepting at most eight
 * paths, and the whole exclusion design in src/main/watcher/ignored-roots.ts
 * turns on what it does at nine. Documentation was not enough to build on, so
 * this program measures it against CoreServices directly, with no library in
 * the way: it creates 24 sibling directories under a root, excludes the first
 * N, touches a file in every one, and reports which of the excluded ones were
 * actually suppressed.
 *
 * Build and run, from the repository root:
 *
 *     npm run conformance:watcher:cap
 *
 * or by hand:
 *
 *     clang -o /tmp/fsevents-cap build/fsevents-cap.c -framework CoreServices
 *     mkdir -p /tmp/capt && for i in $(seq 0 23); do mkdir -p /tmp/capt/d$i; done
 *     /tmp/fsevents-cap 9 /tmp/capt
 *
 * MEASURED ON 2026-08-25, macOS 24.6.0, and reproduced three times at 7, 8
 * and 9:
 *
 *     paths passed   returned   excluded directories actually suppressed
 *     0              false      0
 *     4              true       4
 *     7              true       7
 *     8              true       8
 *     9              FALSE      0
 *     12             FALSE      0
 *     20             FALSE      0
 *
 * THE FINDING, and it is the one that shaped the phase: above the cap the
 * behaviour is silent TOTAL FAILURE rather than truncation. At nine paths the
 * call returns false and NOTHING is excluded, including the `.git` exclusion
 * that has shipped since the watcher was written.
 * `node_modules/@parcel/watcher/src/macos/FSEventsBackend.cc` line 247 never
 * checks the return value, the stream still starts, and nothing is logged. A
 * round that passed "all the ignored roots" to a repository with nine of them
 * would have made that repository strictly worse than it was before.
 *
 * Only the COUNT matters. Separately measured and all accepted, each
 * consuming a slot: a path that does not exist on disk, a relative path, a
 * path outside the watched root, and a duplicate.
 */

#include <CoreServices/CoreServices.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define TOTAL_DIRS 24

static char root[1024];
static int seen[TOTAL_DIRS];

static void cb(ConstFSEventStreamRef stream, void *info, size_t n, void *paths,
               const FSEventStreamEventFlags flags[],
               const FSEventStreamEventId ids[]) {
  (void)stream; (void)info; (void)flags; (void)ids;
  char **p = (char **)paths;
  size_t rootLen = strlen(root);
  for (size_t i = 0; i < n; i++) {
    if (strncmp(p[i], root, rootLen) != 0) continue;
    int d = -1;
    if (sscanf(p[i] + rootLen, "/d%d/", &d) == 1 && d >= 0 && d < TOTAL_DIRS) {
      seen[d] = 1;
    }
  }
}

int main(int argc, char **argv) {
  if (argc < 3) {
    fprintf(stderr, "usage: fsevents-cap <exclusionCount> <rootDir>\n");
    return 2;
  }
  int nExcluded = atoi(argv[1]);
  snprintf(root, sizeof(root), "%s", argv[2]);

  CFStringRef rp = CFStringCreateWithCString(NULL, root, kCFStringEncodingUTF8);
  CFArrayRef watch = CFArrayCreate(NULL, (const void **)&rp, 1, NULL);
  FSEventStreamRef stream =
      FSEventStreamCreate(NULL, &cb, NULL, watch, kFSEventStreamEventIdSinceNow,
                          0.05, kFSEventStreamCreateFlagFileEvents);

  CFMutableArrayRef exclusions = CFArrayCreateMutable(NULL, nExcluded, NULL);
  for (int i = 0; i < nExcluded; i++) {
    char buf[1200];
    snprintf(buf, sizeof(buf), "%s/d%d", root, i);
    CFArrayAppendValue(exclusions,
                       CFStringCreateWithCString(NULL, buf, kCFStringEncodingUTF8));
  }
  Boolean ok = FSEventStreamSetExclusionPaths(stream, exclusions);

  FSEventStreamScheduleWithRunLoop(stream, CFRunLoopGetCurrent(),
                                   kCFRunLoopDefaultMode);
  FSEventStreamStart(stream);
  CFRunLoopRunInMode(kCFRunLoopDefaultMode, 0.4, false);

  for (int i = 0; i < TOTAL_DIRS; i++) {
    char buf[1300];
    snprintf(buf, sizeof(buf), "%s/d%d/f", root, i);
    FILE *f = fopen(buf, "w");
    if (f != NULL) { fprintf(f, "touch%d", rand()); fclose(f); }
  }
  CFRunLoopRunInMode(kCFRunLoopDefaultMode, 2.5, false);

  int suppressed = 0;
  int considered = nExcluded < TOTAL_DIRS ? nExcluded : TOTAL_DIRS;
  for (int i = 0; i < considered; i++) if (!seen[i]) suppressed++;

  /*
   * `delivered` is the CONTROL, and it is not optional. Without it a run that
   * saw no events at all reports perfect suppression, which is exactly what
   * happened the first time this was wired into a script: the caller passed a
   * /var/folders path while FSEvents reports the /private/var form, every
   * path comparison failed, and the table read like a clean pass at nine.
   */
  int delivered = 0;
  for (int i = 0; i < TOTAL_DIRS; i++) if (seen[i]) delivered++;

  printf("{\"pathsPassed\":%d,\"setExclusionPathsReturned\":%s,\"suppressed\":%d,"
         "\"considered\":%d,\"delivered\":%d,\"totalDirs\":%d}\n",
         nExcluded, ok ? "true" : "false", suppressed, considered, delivered,
         TOTAL_DIRS);

  FSEventStreamStop(stream);
  FSEventStreamInvalidate(stream);
  FSEventStreamRelease(stream);
  CFRelease(watch);
  CFRelease(rp);
  return 0;
}
