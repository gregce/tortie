/*
** A fixture for build/conformance-diagnostic.mjs (Phase 364): its walk rule,
** D5, proved before it reads the checker. Every line marked @unchecked must be
** named, and no other: a read through a pcache pointer (`p->`, `*p`, `p[…]`, a
** cast read through directly, or a memcpy/memcmp source) with no tchkReadable
** of that pointer before it in the same function, a loop's own assignments
** taken back at its head, a parameter proved only when every caller passed a
** checked one, and only what the DIAGNOSTIC variant compiles.
*/
typedef struct TchkRegions TchkRegions;
static int tchkReadable(TchkRegions *rc, const void *p, unsigned long n){ (void)rc; (void)p; (void)n; return 1; }

/* 1. checked, then read */
static unsigned w1(TchkRegions *rc, Pager *pg){
  PCache *pc;
  if( pg==0 || !tchkReadable(rc, pg, sizeof(Pager)) ) return 0;
  pc = pg->pPCache;
  if( !tchkReadable(rc, pc, sizeof(PCache)) ) return 0;
  return (unsigned)pc->szPage;
}

/* 2. read, then checked */
static unsigned w2(TchkRegions *rc, Pager *pg){
  PCache *pc;
  if( !tchkReadable(rc, pg, sizeof(Pager)) ) return 0;
  pc = pg->pPCache;
  if( pc->szPage==0 ) return 0; // @unchecked
  if( !tchkReadable(rc, pc, sizeof(PCache)) ) return 0;
  return (unsigned)pc->szPage;
}

/* 3. a loop that checks at its head */
static int w3(TchkRegions *rc, PgHdr1 *p){
  while( p ){
    if( !tchkReadable(rc, p, sizeof(PgHdr1)) ) return 0;
    if( p->iKey==0 ) return 1;
    p = p->pNext;
  }
  return 0;
}

/* 4. checked once, then a loop that moves on: the second turn reads unchecked */
static int w4(TchkRegions *rc, PgHdr1 *p){
  if( !tchkReadable(rc, p, sizeof(PgHdr1)) ) return 0;
  while( p ){
    if( p->iKey==0 ) return 1; // @unchecked
    p = p->pNext; // @unchecked
  }
  return 0;
}

/* 5. an interior pointer of a checked group */
static PgHdr1 *w5(TchkRegions *rc, PGroup *g){
  PgHdr1 *a;
  if( !tchkReadable(rc, g, sizeof(PGroup)) ) return 0;
  a = &g->lru;
  return a->pLruPrev;
}

/* 6. a parameter every caller checked */
static unsigned w6key(PgHdr1 *p){ return p->iKey; }
static unsigned w6(TchkRegions *rc, PgHdr1 *p){
  if( !tchkReadable(rc, p, sizeof(PgHdr1)) ) return 0;
  return w6key(p);
}

/* 7. a parameter one caller did not check */
static unsigned w7key(PgHdr1 *p){ return p->iKey; } // @unchecked
static unsigned w7a(TchkRegions *rc, PgHdr1 *p){
  if( !tchkReadable(rc, p, sizeof(PgHdr1)) ) return 0;
  return w7key(p);
}
static unsigned w7b(PgHdr1 *q){ return w7key(q); }

/* 8. a cast read through directly */
static unsigned w8(void *x){ return ((PgHdr1*)x)->iKey; } // @unchecked

/* 9. a copy out of a pointer the walk found */
static void w9(TchkRegions *rc, PCache1 *c, unsigned char *dst){
  PgHdr1 *q;
  if( !tchkReadable(rc, c, sizeof(PCache1)) ) return;
  q = c->pFree;
  memcpy(dst, q, 8); // @unchecked
}

/* 10. the check compiled into the test variant alone */
static unsigned w10(TchkRegions *rc, PCache1 *c){
#ifdef TCHK_PLANT
  if( !tchkReadable(rc, c, sizeof(PCache1)) ) return 0;
#endif
  return c->nPage; // @unchecked
}

/* 11. the same check in both variants */
static unsigned w11(TchkRegions *rc, PCache1 *c){
  if( !tchkReadable(rc, c, sizeof(PCache1)) ) return 0;
  return c->nPage;
}

/* 12. a for loop over a checked table, each line checked at the inner head */
static unsigned w12(TchkRegions *rc, PCache1 *c){
  unsigned h, n = 0;
  if( !tchkReadable(rc, c, sizeof(PCache1)) ) return 0;
  for(h=0; h<c->nHash; h++){
    PgHdr1 *p = c->apHash[h];
    while( p ){
      if( !tchkReadable(rc, p, sizeof(PgHdr1)) ) return n;
      n++;
      p = p->pNext;
    }
  }
  return n;
}

/* 13. a unary read and an index read */
static unsigned w13(PgHdr *ph, Btree *bt){
  unsigned n = (*ph).pgno; // @unchecked
  return n + (unsigned)(bt[0].inTrans); // @unchecked
}

/* 14. checked in a condition, read in its consequent */
static unsigned w14(TchkRegions *rc, PgHdr *ph){
  if( tchkReadable(rc, ph, sizeof(PgHdr)) ) return ph->pgno;
  return 0;
}

/* 15. a product is not a read */
static unsigned w15(TchkRegions *rc, PCache1 *c, unsigned k){
  if( !tchkReadable(rc, c, sizeof(PCache1)) ) return 0;
  return k * c->nPage;
}

/* 16. a do-while that moves on */
static int w16(TchkRegions *rc, PgHdr1 *p){
  if( !tchkReadable(rc, p, sizeof(PgHdr1)) ) return 0;
  do{
    if( p->iKey==0 ) return 1; // @unchecked
    p = p->pNext; // @unchecked
  }while( p );
  return 0;
}

/* 17. a check through a cast, and a copy of a checked pointer */
static unsigned w17(TchkRegions *rc, PgHdr1 *p){
  PgHdr1 *same;
  if( !tchkReadable(rc, (const void*)p, sizeof(PgHdr1)) ) return 0;
  same = p;
  return same->iKey;
}

/* 18. only the test variant reads, so the diagnostic one has nothing to check */
static unsigned w18(PCache1 *c){
#ifdef TCHK_PLANT
  return c->nPage;
#else
  (void)c;
  return 0;
#endif
}

/* 19. a read through a parenthesized pointer */
static unsigned w19(TchkRegions *rc, PCache1 *c){
  PgHdr1 *p;
  if( !tchkReadable(rc, c, sizeof(PCache1)) ) return 0;
  p = c->pFree;
  return (p)->iKey; // @unchecked
}

/* 20. the same pointer checked, then read through its parentheses */
static unsigned w20(TchkRegions *rc, PgHdr1 *p){
  if( !tchkReadable(rc, p, sizeof(PgHdr1)) ) return 0;
  return ((p))->iKey;
}

/* 21. a declaration list is not a read: `*prev` declares, it does not read */
static int w21(TchkRegions *rc, const PCache1 *c){
  const PgHdr1 *anchor, *prev, *p;
  PgHdr1 *const *ap;
  if( !tchkReadable(rc, c, sizeof(PCache1)) ) return 0;
  ap = c->apHash;
  anchor = 0;
  prev = anchor;
  p = prev;
  return ap!=0 && p==0;
}
