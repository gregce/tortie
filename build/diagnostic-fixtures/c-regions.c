/*
** A fixture for build/conformance-diagnostic.mjs (Phase 364): its C lexer and
** its reading of the #if groups, proved before any rule reads the checker.
**
** A line comment of markers says what the reader must find on its line:
**   @plant, @diag or @both   compiled only with TCHK_PLANT, only without it,
**                            or either way
**   @in or @out              compiled, or not, by the DIAGNOSTIC variant
**                            (TCHK_PLANT and every TCHK_ABLATE_* undefined)
**   @str:<text>              the one string the compiler makes of the line's
**                            literals, escapes as written
** A string literal on a line without @str fails the proof, so the lexer can
** read no string out of a comment. This comment names "[p358adv-PLANT]",
** P358ADV_PLANT, sigaction(), malloc(16) and _exit(139), and none of them is
** code.
*/
static int a1; // @both @in
#ifdef TCHK_PLANT
static int a2; // @plant @out
# if defined(__APPLE__)
static int a3; // @plant @out
# else
static int a4; // @plant @out
# endif
#else
static int a5; // @diag @in
#endif
#ifndef TCHK_PLANT
static int a6; // @diag @in
#else
static int a7; // @plant @out
#endif
#if defined(TCHK_PLANT) && defined(__APPLE__)
static int a8; // @plant @out
#elif defined(__linux__)
static int a9; // @both @in
#else
static int a10; // @both @in
#endif
#if defined(TCHK_PLANT) || defined(TCHK_FORCE)
static int a11; // @both @in
#endif
#if !defined(TCHK_PLANT)
static int a12; // @diag @in
#endif
#ifdef TCHK_ABLATE_OWNER
static int a13; // @both @out
#else
static int a14; // @both @in
#endif
#ifndef TCHK_ABLATE_GUARD
static int a15; // @both @in
#else
static int a16; // @both @out
#endif
#if 0
static int a17; // @both @out
#endif
#if !defined(TCHK_PLANT) && (defined(TCHK_ABLATE_OWNER) || defined(TCHK_ABLATE_GUARD))
static int a18; // @diag @out
#endif
#if defined(TCHK_ABLATE_OWNER) || defined(TCHK_ABLATE_GUARD)
static int a18b; // @both @out
#endif
#ifdef TCHK_PLANT
static const char *s0 = "[p358" "adv-SPLIT]"; // @plant @out @str:[p358adv-SPLIT]
#endif
static const char *s1 = "a\"b" "c"; // @both @in @str:a\"bc
static const char *s2 = "/* not a comment */"; // @both @in @str:/* not a comment */
static const char *s3 = "// nor this"; // @both @in @str:// nor this
static const char c1 = '"'; // @both @in
static const char *s4 = "\\"; // @both @in @str:\\
#define TCHK_FIXTURE_MACRO(x) \
  do{ (void)(x); }while(0)
static int a19; // @both @in
static const char *s5 = "ends here"; // @both @in @str:ends here
/* a comment
   that spans lines, holding "P358ADV_HIDDEN" */ static int a20; // @both @in
#ifdef TCHK_PLANT
#ifndef TCHK_ABLATE_COUNT
static int a21; // @plant @out
#endif
#endif
