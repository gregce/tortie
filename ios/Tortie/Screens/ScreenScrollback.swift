// The Terminal's history: what the phone holds of what a session printed,
// where each row of it is laid out, and which page to ask for next (Phase
// 337.1, build/p3371/SPEC.md D13, D25 to D28, D31 and section 5.5.4; Phase
// 337.3, build/p3373/SPEC.md D1 to D11 and section 5.1).
//
// HIS RULINGS. "Yes, scroll back on the Screen" (Phase 337.1): his Phase 316
// refusal of the raw terminal scrollback is lifted for the Terminal. He
// scrolls up and the terminal scrolls back through what the session printed,
// as far as the Mac keeps it, while the live rows at the bottom keep
// updating. And his item 1 of 2026-10-07 (Phase 337.3): "when it opens today,
// it is shown like this [the live rows at the top of the screen and empty
// space below] but i'd rather more of the scrollback (if available) in
// vertical mode could be shown like this [the screen filled with earlier
// output, the live rows at the bottom]".
//
// THE INDEX SPACE IS TMUX'S OWN (D2): line `i` of a session's history, 0 being
// the oldest line tmux holds, keeps its index while lines scroll in under it,
// and the live screen's top row is index `depth`, which each live picture
// carries with the pane's `space` (D3). A page is asked by index and answered
// with the depth, the width and the space it was read at (D7, D8).
//
// THE LAYOUT (`ScrollbackLayout`, pure; D25). While an index space is held it
// covers indices `[top, H)` of history, then the live rows at `[H, H + rows)`;
// `H` is the live picture's depth, the last one that was a number; with none
// held it is the live rows alone. Of the history rows, `[lo, hi)` are HELD and
// every other one is RESERVED, drawn as the ground until its page lands; of the
// held rows, `[lo, checked)` came in pages and `[checked, hi)` were CARRIED
// from the live screen (below), or, following, are holes. Every row is one
// cell tall, so a row's place is `(index - top)` rows.
//
// RESERVE FIRST, FILL LATER (D26). Rows are reserved above before they are
// fetched, never inserted where he looks; `reserve(visibleTop:fill:)` is THE
// ONE PLACE `top` MOVES, and it answers the rows it reserved, which the scroll
// view adds to its offset in the same layout pass (Screens/ScreenScroller.swift).
// A page then FILLS reserved rows and moves nothing; eviction turns held rows
// back into reserved ones; neither changes where a row of history is laid out.
// Of `[checked, hi)`, a row not held is a HOLE (below), reserved like any other.
//
// THE FILL (337.3 D1 to D3, D7). Following holds the live picture's index
// space from the first picture that offers one, at ANY depth, 0 included, and
// the scroll view's layout pass asks `reserve(visibleTop:fill:)`, BEFORE it
// sizes the content, for the rows its view holds above the live rows; they are
// reserved in whole pages, never below index 0 and never fewer than before, so
// the first frame already draws the live rows at the bottom and the first page
// fills the rows above them. The alternate screen (a full-screen program covers
// the history: today's look), another pane, another width or a shallower
// history drops what following holds, drawing nothing and saying nothing, and
// the next pass fills again.
//
// CARRYING (337.3 D5). tmux pushes a screen's top row into its history as the
// screen scrolls, and a line keeps its index once it has scrolled off, so when
// a steady picture's depth is `k` more than the last steady picture's, in the
// same space and width, with the held rows reaching the live top, the first of
// the `k` lines that scrolled off ARE that picture's top rows, as many as it
// had: they are held at once, carried, with that picture's styles. Scrolled
// carries only when they are every line, and leaves any other growth reserved
// under the held rows for pages to fill (337.1's walk, D14).
//
// NOTHING DRAWN IS TAKEN AWAY WHILE FOLLOWING (the Phase 337.3 verify after
// the reboot, and his rule that a page the picture outran is carried or read
// again, never dropped to blank). More lines between two pictures than the
// screen holds (a flood, a return to the Terminal while an agent printed, a
// selection let go, or output near a screen a picture) leave lines no picture
// showed: following carries what the last picture showed and keeps those
// lines as HOLES under `hi`, which moves to the new live top, so the next
// picture carries again and no row already drawn goes blank. A hole is drawn
// as the ground until a page brings it, and a page for rows in view goes at
// once, from the live top when the checked rows are more than a page below it
// (`want`'s live top's page, which `accept` joins by dropping the rows under
// it, all out of view), so a lone flood or return is filled within one round
// trip. Following counts each picture that left a hole (`outruns`). When two
// come within `outrunGap` of each other the output is outrunning the screen,
// and until `outrunGap` after the last such picture following ASKS NO PAGE:
// one would be scrolled away before it filled anything, and the Mac reads no
// page the output would throw away (the reverify's four a second). Carrying
// goes on, so the band keeps every row a picture showed. Only when such a
// picture PASSES THE VIEW (more new lines than the screen and every row the
// view holds above it, so whatever it carries lands above the view) does
// following also CARRY NOTHING until then: the rows above the prompt go to the
// ground once, as each drawn row scrolls away with the output, and stay the
// ground, as build 7 drew nothing there, rather than flashing between pictures
// that pass the view and pictures that fall short of it (the fix round of the
// Phase 337.3 verify: 9 to 98 flashes a minute in the build it read, measured).
// Once it has calmed, the one page from the live top fills the view.
//
// CHECKS (337.3 D6). A carried row is drawn as any held row, is NEVER an
// overlap anchor, and is replaced by the next page that covers it, silently:
// the page is the truth. Newer pages adjoin the CHECKED rows; one that brings
// carried rows alone is a check, asked only while a carried row is in view and
// no sooner than `checkGap` (1 s) after the last page started, so a phone
// watching a busy session costs the Mac at most one check a second; a page for
// reserved rows keeps `minGap` (0.25 s).
//
// TWO MODES (D27; 337.3 D9, D10). `following`: the view at the live bottom,
// with the history that fills it above the live rows. `scrolled`: his place
// kept, entered when the view leaves its bottom with its top above the live
// top. The back-to-live button, a drag that ends at the bottom, or any key he
// sends returns to `following`, keeping what is held when it reaches the live
// top and paging has not stopped, and dropping every held and reserved row
// otherwise. Every live picture's depth raises `depthSeen`, so a trim is seen
// within one picture; a page raises it only while scrolled, because following
// reads pictures and pages on two connections, and a picture read before a
// deeper page must not land after it as a trim (the reverify's blink).
//
// EVERY PAGE IS VERIFIED BEFORE IT IS JOINED (D13): its `space` and `wrap` are
// the ones held, its `depth` is at least `depthSeen`, it answers the rows
// asked, and the rows it shares with the CHECKED rows (8 at the edge it
// adjoins) read the same text. Anything else, while scrolled, stops paging
// with `Earlier lines changed on your Mac. Go back to the live terminal to read
// them again.` until he goes back to the live terminal, which reads it all
// again; while following, it drops what following holds, says nothing, keeps
// the rows above the live rows as the ground so the live rows stay at the
// bottom, and fills again only from a picture whose depth, space or width
// differs (337.3 D8); and a page the door refuses (404) turns the fill off for
// this Terminal.
//
// AT MOST 3,000 ROWS (D28), the farthest from the view evicted first, and
// none while he is selecting (D31): a selection that reaches rows not yet
// fetched draws no Copy until they land, so Copy never puts a blank line where
// a line of his was.
//
// THE DESIGN IS PASEO'S (packages/app/src/terminal/native-renderer/
// headless-terminal-state.ts, `extractBufferWindow` and
// `extractBufferBounds`, and terminal-scrollback.test.ts, at getpaseo/paseo
// 2f0cb2f54be5742d6fc7e9b85ba39808ac22ad93, Apache-2.0, by the Paseo
// authors), ported to Swift, and no Paseo code is copied: rows by ABSOLUTE
// index from the oldest, a window of rows by its first row and its count, the
// `following` and `scrolled` modes, the place kept when output arrives, and
// the bottom affordance back to the tail. Not taken: its headless terminal on
// the device, which holds the buffer (the Mac holds it, his 337 ruling 4); its
// trim listener (tmux reports none, so the depth and the overlap stand in);
// its 1,000-line default.
//
// NOTHING IS KEPT. Every row lives in memory while the Terminal is up, and
// nothing is written, cached or logged. Every whole number the door sends is
// taken through `DoorNumber`, which cannot trap (conformance:ios rule k).

import Foundation
import Observation

// MARK: - What is held

/// The Terminal's two modes (D27).
enum ScrollbackMode: Equatable, Sendable {
    /// The view at the live bottom, with the history that fills it above the
    /// live rows (337.3 D1).
    case following
    /// His place kept above the live rows.
    case scrolled
}

/// Where paging stopped, or that it reached the oldest line.
enum ScrollbackEdge: Equatable, Sendable {
    /// The index space moved: main's sentence, or the phone's own (the same
    /// words). Nothing more is fetched until `following`.
    case moved(String)
    /// The Mac said the session ended or could not be read: paging stops, and
    /// the live picture's own line says why. Following, the next picture with
    /// a numeric depth resumes it (337.3 D8).
    case stopped
    /// The oldest line tmux holds is held: above it, nothing.
    case atOldest
}

/// One row of history the phone holds: laid out once, with the style table of
/// the page (or the live picture) it came in.
struct ScrollbackRow: Equatable, Sendable {
    let row: ScreenRowModel
    let styles: [ScreenStyle]
    /// Carried from a live picture as it scrolled into history (337.3 D5):
    /// drawn as any held row, never an overlap anchor, and replaced by the
    /// page that covers it (D6).
    let carried: Bool

    init(row: ScreenRowModel, styles: [ScreenStyle], carried: Bool = false) {
        self.row = row
        self.styles = styles
        self.carried = carried
    }
}

/// The one page to ask next (D27, section 5.5.4).
struct ScrollbackAsk: Equatable, Sendable {
    let from: Int
    let count: Int
    /// `depthSeen`: the newest history size the phone saw in this index space.
    let depth: Int
    /// The width the index space was read at, echoed.
    let wrap: Int
    let keep: ScrollbackKeep
    /// The CHECKED rows of the page the phone already holds: at its bottom for
    /// an older page, at its top for a newer one, none when none is checked.
    let overlap: Int
    /// A check (337.3 D6): every row it brings past its overlap is carried and
    /// no reserved row waits within a page of the view, so it is asked no
    /// sooner than `ScrollbackModel.checkGap` after the last page started.
    let checks: Bool

    init(from: Int, count: Int, depth: Int, wrap: Int, keep: ScrollbackKeep, overlap: Int, checks: Bool = false) {
        self.from = from
        self.count = count
        self.depth = depth
        self.wrap = wrap
        self.keep = keep
        self.overlap = overlap
        self.checks = checks
    }
}

/// What a page came to.
enum ScrollbackLanding: Equatable, Sendable {
    /// Joined: the rows it filled (reserved) or replaced (carried).
    case joined(Int)
    /// The index space moved, by main's word or the phone's own check.
    case moved
    /// The Mac was busy: the same page is asked again after its back-off.
    case busy
    /// The session ended or could not be read: paging stops.
    case stopped
    /// It arrived after what it was asked for was let go, or it was read
    /// before the newest picture the phone holds: nothing joined, nothing
    /// refused, and the next page is asked as the layout now stands.
    case ignored
}

// MARK: - The layout (pure)

/// Where every row of the Terminal is, and what is held (D25 to D28; 337.3
/// D1 to D11). Pure: no clock, no door, no view.
struct ScrollbackLayout: Equatable, Sendable {
    /// Rows a page asks for, and rows reserved at a time (D26, D27).
    static let pageRows = 100
    /// Rows a page shares with the ones held, at the edge it adjoins (D13).
    static let overlapRows = 8
    /// The most rows of history held (D28).
    static let mostHeld = 3_000

    /// The live picture's index space: nil while the picture offers none (the
    /// alternate screen, an unsteady read, a Mac older than 337.1).
    struct Offer: Equatable, Sendable {
        let depth: Int
        let space: String
        let columns: Int
    }

    private(set) var mode: ScrollbackMode = .following
    /// The first index laid out while an index space is held. It moves in
    /// `reserve(visibleTop:fill:)` alone.
    private(set) var top = 0
    /// `H`: the index of the live top row, from the last live picture whose
    /// depth was a number.
    private(set) var live = 0
    /// The live screen's rows.
    private(set) var liveRows = 0
    /// The rows held, by index: every one of `[lo, checked)`, and of
    /// `[checked, hi)` every one but the holes following left.
    private(set) var held: [Int: ScrollbackRow] = [:]
    private(set) var lo = 0
    private(set) var hi = 0
    /// The end of the rows pages brought (337.3 D6): `[lo, checked)` are
    /// checked, `[checked, hi)` carried, or holes (lines no picture showed,
    /// left while following); `lo <= checked <= hi`.
    private(set) var checked = 0
    /// The newest history size seen in this index space (D27).
    private(set) var depthSeen = 0
    /// The index space held: the width it was read at and its pane.
    private(set) var wrap = 0
    private(set) var space: String?
    private(set) var edge: ScrollbackEdge?
    /// What the newest live picture offers.
    private(set) var offered: Offer?
    /// The last live picture whose depth was a number, kept for carrying
    /// (337.3 D5).
    private(set) var lastSteady: ScreenPicture?
    /// D8: the offer current when a page was refused while following; the
    /// fill is not asked again until a picture offers another.
    private(set) var refusedAt: Offer?
    /// D8: the door refused a page (404, or a line it closed before an
    /// answer); following fills no more on this Terminal.
    private(set) var fillOff = false
    /// The pictures, while following, that left holes (lines no picture
    /// showed, the Phase 337.3 verify): when two come within
    /// `ScrollbackModel.outrunGap` the model has following carry nothing and
    /// ask no page until `outrunGap` after the last.
    private(set) var outruns = 0
    /// The rows a page shares with the held ones: 8, or 1 after a page that
    /// was so cut it brought nothing new (every cell its own colour), so the
    /// next one does.
    private(set) var overlapWanted = ScrollbackLayout.overlapRows

    /// The first index laid out: `top` while an index space is held, in
    /// either mode (337.3 D1), the live top while none is.
    var firstRow: Int { space == nil ? live : top }
    /// The live top row's place, in rows from the first.
    var liveRow: Int { Self.less(live, firstRow) }
    /// Every row laid out: history (held or reserved), then the live rows.
    var rowCount: Int { Self.plus(liveRow, liveRows) }
    /// Paging has stopped: until `following` while scrolled, and following
    /// until the next picture with a numeric depth (`.stopped`, D8).
    var pagingStopped: Bool {
        switch edge {
        case .moved?, .stopped?: true
        case .atOldest?, nil: false
        }
    }

    // MARK: The arithmetic, through DoorNumber (rule k)

    /// `a + b`. Every index here is at most the deepest index and two pages,
    /// so the sum is exact; past `DoorNumber`'s bound it answers the larger,
    /// which only asks for less.
    static func plus(_ a: Int, _ b: Int) -> Int {
        DoorNumber.sum(a, b) ?? max(a, b)
    }

    /// `a - b`, or 0 when `b` is past `a`.
    static func less(_ a: Int, _ b: Int) -> Int {
        DoorNumber.difference(a, b) ?? 0
    }

    // MARK: A live picture

    /// A live picture landed, in this order (337.3 section 5.1): what it
    /// offers; a refused fill re-armed by another offer (D8); the alternate
    /// screen, which returns to `following` and drops everything held above
    /// the live rows (D7); no offer, which leaves the live rows where the last
    /// number put them (section 5.6); an offer with no index space held, which
    /// places the live rows at its depth for the next `reserve(` to hold; and
    /// an offer in the held index space, which raises `depthSeen`, carries the
    /// lines that scrolled off (D5) and moves the live rows down. Another
    /// space, another width or a shallower history is, while scrolled, the
    /// index space moving (the line); while following, a drop, with no line.
    /// Following, lines that scrolled off past the ones carried are holes
    /// under `hi`, never a drop, counted in `outruns` (the Phase 337.3
    /// verify); and while `carrying` is false (the model's hold, output that
    /// passes the view picture after picture) every new line is a hole, and
    /// every row held stays held.
    mutating func picture(_ picture: ScreenPicture, holds: (Character) -> Bool = ScreenFont.holds, carrying: Bool = true) {
        liveRows = picture.rowCount
        let offer = picture.alternate ? nil : Self.offer(of: picture)
        offered = offer
        if let refused = refusedAt, let offer, offer != refused {
            refusedAt = nil
        }
        defer { if offer != nil { lastSteady = picture } }
        if picture.alternate {
            if mode == .scrolled { _ = follow() }
            drop()
            return
        }
        guard let offer else { return }
        guard let heldSpace = space else {
            live = offer.depth
            return
        }
        if mode == .following, edge == .stopped { edge = nil }
        if mode == .scrolled, pagingStopped { return }
        guard offer.space == heldSpace, offer.columns == wrap, offer.depth >= depthSeen else {
            switch mode {
            case .scrolled:
                edge = .moved(Copy.scrollbackMoved)
            case .following:
                drop()
                live = offer.depth
            }
            return
        }
        depthSeen = offer.depth
        if mode == .following {
            // THE LINES THAT SCROLLED OFF, FOLLOWING (D5; the Phase 337.3
            // verify after the reboot). The last steady picture's rows are
            // carried at once, as many as it had; lines past them (more lines
            // between two pictures than the screen holds: a flood, a return
            // to the Terminal while an agent printed, a selection let go, or
            // output near a screen a picture) are HOLES under `hi`, which
            // moves to the new live top, so the next picture carries again
            // and NO ROW ALREADY DRAWN GOES BLANK. The build before this one
            // dropped everything held at such a picture and refilled after a
            // second: the band above the prompt blank for 1.15 to 1.55 s on a
            // return or a flood, and flickering 9 to 98 times a minute under
            // output near a screen a picture (measured). A hole is the
            // ground until a page brings it (`want`), and the picture is
            // counted in `outruns` for the model, which hands `carrying:
            // false` while such pictures come again and again AND pass the
            // view, so the rows above the prompt go to the ground once and
            // stay there rather than flashing whenever one picture falls short.
            let screen = lastSteady?.rowCount ?? liveRows
            let lines = Self.less(offer.depth, live)
            if carrying { _ = carry(to: offer.depth, holds: holds) }
            if lines > screen { outruns = Self.plus(outruns, 1) }
            if hi < offer.depth { hi = offer.depth }
            live = offer.depth
            return
        }
        if carry(to: offer.depth, holds: holds) == 0 {
            live = max(live, offer.depth)
            return
        }
        if lo == hi {
            // Nothing held, scrolled: the first page is the rows just above
            // the live screen (337.1's), wherever the live top has moved to.
            lo = offer.depth
            hi = offer.depth
            checked = offer.depth
        }
        live = max(live, offer.depth)
    }

    /// What a picture offers: its depth and its space, both or neither, at
    /// its width.
    static func offer(of picture: ScreenPicture) -> Offer? {
        guard let depth = picture.historyDepth, let space = picture.space else { return nil }
        return Offer(depth: depth, space: space, columns: picture.columns)
    }

    /// CARRYING (337.3 D5): the `k` lines that scrolled off between the last
    /// steady picture and this one begin with that picture's top rows, when
    /// it is in the held space and width and the held rows reach the live
    /// top. As many as it had, at most `k`, are held at indices from `live`,
    /// carried, with its styles; `hi` moves to the new live top. Scrolled
    /// carries only when they are every line (`k` at most its rows), and
    /// otherwise leaves the gap to pages (337.1, D14); following carries them
    /// whatever `k` is, and the lines past them are holes (the Phase 337.3
    /// verify). Answers how many lines it could not carry, or nil when it
    /// carried nothing.
    private mutating func carry(to depth: Int, holds: (Character) -> Bool) -> Int? {
        guard hi == live, let last = lastSteady, last.space == space, last.columns == wrap,
              let k = DoorNumber.difference(depth, live), k > 0 else { return nil }
        let shown = min(k, last.rowCount)
        guard shown == k || mode == .following else { return nil }
        for (place, row) in last.rows.prefix(shown).enumerated() {
            let index = Self.plus(live, place)
            held[index] = ScrollbackRow(row: ScreenRowModel(index: index, runs: row.runs, holds: holds), styles: last.styles, carried: true)
        }
        hi = depth
        return Self.less(k, shown)
    }

    /// Whether a row of `[from, to)` is a hole: inside the held rows' range
    /// but not held, a line no picture showed (the Phase 337.3 verify).
    private func hole(from: Int, to: Int) -> Bool {
        guard from < to else { return false }
        return (from..<to).contains { held[$0] == nil }
    }

    /// Whether a row of `[from, to)` waits for a page: a hole, or a row
    /// carried from the live screen and not yet checked.
    private func unsettled(from: Int, to: Int) -> Bool {
        guard from < to else { return false }
        return (from..<to).contains { held[$0]?.carried ?? true }
    }

    /// Following drops everything it holds above the live rows (D7, D8):
    /// the layout is the live rows alone again, drawing nothing and saying
    /// nothing, and the next `reserve(` holds the picture's space afresh.
    private mutating func drop() {
        space = nil
        held = [:]
        lo = live
        hi = live
        checked = live
        edge = nil
        overlapWanted = Self.overlapRows
    }

    /// Hold `offer`'s index space at its depth (D7): nothing held, nothing
    /// reserved yet. `reserve(` sets `top`.
    private mutating func establish(_ offer: Offer) {
        space = offer.space
        wrap = offer.columns
        depthSeen = offer.depth
        live = offer.depth
        lo = offer.depth
        hi = offer.depth
        checked = offer.depth
        held = [:]
        edge = nil
        overlapWanted = Self.overlapRows
    }

    // MARK: Reserving (D26; 337.3 D2, D3)

    /// THE ONE PLACE `top` MOVES. Following, the picture's index space is
    /// held when none is (not while the fill is off), at any depth, and the
    /// view's `fill` rows above the live rows are reserved in whole pages,
    /// `top` only ever moving up, never below 0. While a refusal holds the
    /// space is held and the fill reserved all the same, the ground, with no
    /// page asked (`want`), so the live rows stay at the bottom (the Phase
    /// 337.3 fix round: a page refused across a trim or a pane switch put the
    /// live rows at the view's top for the 50 to 100 ms until the picture
    /// that showed the change, measured in 7 of 60 runs). Scrolled, a pull
    /// with no space held holds it and reserves the first page above the live
    /// rows; with one held, a view whose top is within one page of `top`
    /// reserves the next. Answers the rows reserved above the first row,
    /// which the scroll view adds to its offset in the same pass (D26).
    mutating func reserve(visibleTop: Int, fill: Int) -> Int {
        let first = firstRow
        switch mode {
        case .following:
            if space == nil {
                guard let offer = offered, !fillOff else { return 0 }
                establish(offer)
                top = offer.depth
            }
            // ⌈fill ÷ pageRows⌉ × pageRows, by whole pages through `plus`; a
            // view holds far fewer rows than `mostHeld`, which bounds the loop.
            var covered = 0
            while covered < min(fill, Self.mostHeld) {
                covered = Self.plus(covered, Self.pageRows)
            }
            let want = Self.less(live, covered)
            if want < top { top = want }
        case .scrolled:
            if space == nil {
                guard let offer = offered else { return 0 }
                establish(offer)
                top = Self.less(offer.depth, Self.pageRows)
            } else {
                guard !pagingStopped, top > 0, visibleTop < Self.plus(top, Self.pageRows) else { return 0 }
                top = Self.less(top, Self.pageRows)
            }
        }
        return Self.less(first, firstRow)
    }

    /// Following → `scrolled` (337.3 D9): the layout kept exactly as it is,
    /// no row added, and only while an index space is held or offered, so a
    /// pull over a full-screen program never enters `scrolled`.
    mutating func scroll() {
        guard mode == .following, space != nil || offered != nil else { return }
        mode = .scrolled
    }

    // MARK: The next page (D27; 337.3 D6)

    /// The ONE next page to ask, or none, in either mode: only for reserved
    /// rows in view and, scrolled, one page beyond each edge of them, or
    /// carried rows in view; older pages adjoin `lo` and newer pages the
    /// CHECKED rows, each sharing checked rows alone; never past `depthSeen`.
    /// Following asks nothing while a refusal holds or the fill is off (D8),
    /// looks for holes in view alone, and, when the checked rows are more
    /// than a page below the live top, asks the live top's page.
    func want(visibleTop: Int, visibleBottom: Int) -> ScrollbackAsk? {
        guard space != nil, !pagingStopped, top < live else { return nil }
        if mode == .following, fillOff || refusedAt != nil { return nil }
        let reachTop = max(top, Self.less(visibleTop, Self.pageRows))
        let reachBottom = min(live, Self.plus(visibleBottom, Self.pageRows))
        guard reachTop < reachBottom else { return nil }
        let overlap = min(overlapWanted, Self.less(checked, lo))
        // Reserved above `lo`; carried, or holes following left, in
        // `[checked, hi)`; reserved in `[hi, live)`. Following pages nothing
        // past the view (a drag up is `scrolled`, which reaches a page ahead).
        let olderInView = max(top, visibleTop) < min(lo, visibleBottom)
        let older = mode == .scrolled && reachTop < lo
        let carriedInView = max(checked, visibleTop) < min(hi, visibleBottom)
        let reservedInView = max(hi, visibleTop) < min(live, visibleBottom)
        let holes = mode == .following
            ? hole(from: max(checked, visibleTop), to: min(hi, visibleBottom))
            : hole(from: max(checked, reachTop), to: min(hi, reachBottom))
        let reserved = hi < reachBottom || holes
        if olderInView || (older && !(carriedInView || reservedInView)) {
            let from = max(top, Self.less(lo, Self.pageRows))
            return ask(from: from, count: Self.plus(Self.less(lo, from), overlap), keep: .bottom, overlap: overlap, checks: false)
        }
        if mode == .following, Self.plus(checked, Self.pageRows) < live, visibleTop >= Self.less(live, Self.pageRows) {
            // THE LIVE TOP'S PAGE (the Phase 337.3 verify after the reboot):
            // the checked rows are more than a page below the live top (a
            // flood, a return, output faster than the checks), so a page that
            // adjoins them would walk up from rows out of view toward the
            // view, ⌈gap ÷ 100⌉ pages, while holes stay blank above the
            // prompt. Every row the view holds above the live rows lies in
            // the page that ends at the live top, so it is asked instead,
            // sharing nothing (as the fill's first page), and `accept` joins
            // it by dropping the rows under it, all out of view.
            guard unsettled(from: visibleTop, to: min(live, visibleBottom)) else { return nil }
            let from = max(top, Self.less(live, Self.pageRows))
            return ask(from: from, count: Self.less(live, from), keep: .bottom, overlap: 0, checks: !hole(from: from, to: live))
        }
        if carriedInView || reserved {
            let from = Self.less(checked, overlap)
            let fresh = min(Self.pageRows, Self.less(live, checked))
            let carriedOnly = Self.plus(checked, fresh) <= hi && !hole(from: checked, to: Self.plus(checked, fresh))
            return ask(from: from, count: Self.plus(fresh, overlap), keep: .top, overlap: overlap, checks: carriedOnly && !reserved)
        }
        return nil
    }

    /// An ask, checked: at least one new row, at most a page's rows, and never
    /// past the newest depth the phone saw (D7: a page past the top of the
    /// phone's own index space is no page).
    private func ask(from: Int, count: Int, keep: ScrollbackKeep, overlap: Int, checks: Bool) -> ScrollbackAsk? {
        guard count > overlap, count <= PocketScrollbackAnswer.mostRows,
              let end = DoorNumber.sum(from, count), end <= depthSeen else { return nil }
        return ScrollbackAsk(from: from, count: count, depth: depthSeen, wrap: wrap, keep: keep, overlap: overlap, checks: checks)
    }

    // MARK: A page (D13; 337.3 D5, D6, D8)

    /// A page landed for `ask`, in either mode. It is joined only when its
    /// index space is the one held, its depth at least `depthSeen`, it answers
    /// the rows asked, and the rows it shares with the CHECKED rows read the
    /// same; it then FILLS reserved rows and REPLACES carried ones, never a
    /// checked one, and the layout's height does not change. A page read
    /// before the newest picture the phone holds (its depth at least the one
    /// asked, below `depthSeen`) is asked again rather than refused. Anything
    /// else is refused: scrolled, paging stops with the line; following, what
    /// following holds is dropped, with no line, until another offer (D8).
    mutating func accept(_ page: PocketScrollbackAnswer, for ask: ScrollbackAsk, holds: (Character) -> Bool = ScreenFont.holds) -> ScrollbackLanding {
        guard space != nil, !pagingStopped else { return .ignored }
        if let why = page.why {
            switch why {
            case .busy:
                return .busy
            case .moved:
                refuse(page.sentence ?? Copy.scrollbackMoved)
                return .moved
            case .ended, .unreachable:
                edge = .stopped
                return .stopped
            }
        }
        if let depth = page.pageDepth, page.space == space, page.pageWrap == wrap, depth >= ask.depth, depth < depthSeen {
            return .ignored
        }
        guard let from = page.pageFrom, let depth = page.pageDepth, page.pageWrap == wrap, page.space == space,
              depth >= depthSeen, !page.rows.isEmpty, page.rows.count <= ask.count,
              let end = DoorNumber.sum(from, page.rows.count), let asked = DoorNumber.sum(ask.from, ask.count),
              Self.answers(from: from, end: end, asked: ask, askedEnd: asked) else {
            refuse(Copy.scrollbackMoved)
            return .moved
        }
        let styles = page.styles.map(ScreenStyle.init)
        var rows: [Int: ScrollbackRow] = [:]
        for (offset, runs) in page.rows.enumerated() {
            let index = Self.plus(from, offset)
            let row = ScreenRowModel(
                index: index,
                runs: runs.map { ScreenRun(text: $0.text, styleIndex: $0.runStyle, span: $0.runCells) },
                holds: holds
            )
            rows[index] = ScrollbackRow(row: row, styles: styles)
        }
        // The held rows moved under it since it was asked (an eviction): a
        // page that would leave a gap is asked again as the layout now stands.
        if lo < hi, from > hi || end < lo { return .ignored }
        guard overlapAgrees(rows, ask: ask, askedEnd: asked) else {
            refuse(Copy.scrollbackMoved)
            return .moved
        }
        var fresh = 0
        for (index, row) in rows where held[index]?.carried ?? true {
            held[index] = row
            fresh = Self.plus(fresh, 1)
        }
        if mode == .following, lo < from, checked < from {
            // THE LIVE TOP'S PAGE joined (`want`; the Phase 337.3 verify): it
            // shares no row with the checked ones, which lie more than a page
            // below the live top and so out of view, as does every row under
            // the page. They go back to reserved, and the page's rows are the
            // checked ones; carried rows and holes above it stay.
            for index in lo..<from { held[index] = nil }
            lo = from
            checked = end
            if hi < end { hi = end }
        } else if lo < hi {
            if from <= checked { checked = max(checked, end) }
            lo = min(lo, from)
            hi = max(hi, end)
        } else {
            lo = from
            hi = end
            checked = end
        }
        // A page raises depthSeen only while scrolled (the Phase 337.3
        // reverify's blink): following, the Mac's watcher and its page reader
        // are two connections, so a picture read BEFORE the page can land
        // after it with a smaller depth, which the picture guard would read
        // as a trim and drop the whole fill for a round trip (29 blinks of
        // 250 to 870 ms in 20 runs of 32 s, measured). Following, depthSeen
        // is the newest picture's depth alone; a page deeper than it is joined
        // and the next picture raises it.
        if mode == .scrolled { depthSeen = max(depthSeen, depth) }
        overlapWanted = fresh > 0 ? Self.overlapRows : 1
        refusedAt = nil
        fillOff = false
        if lo == 0, edge == nil { edge = .atOldest }
        return .joined(fresh)
    }

    /// A page refused: scrolled, paging stops with `sentence` until
    /// `following` (337.1); following, what following holds is dropped, with
    /// no line, and the fill waits for another offer (D8).
    private mutating func refuse(_ sentence: String) {
        switch mode {
        case .scrolled:
            edge = .moved(sentence)
        case .following:
            refusedAt = offered ?? space.map { Offer(depth: depthSeen, space: $0, columns: wrap) }
            drop()
        }
    }

    /// The page holds the rows asked: from the asked first row when it keeps
    /// the top, to the asked last row when it keeps the bottom, and nothing
    /// outside them.
    private static func answers(from: Int, end: Int, asked: ScrollbackAsk, askedEnd: Int) -> Bool {
        switch asked.keep {
        case .top:
            return from == asked.from && end <= askedEnd
        case .bottom:
            return end == askedEnd && from >= asked.from
        }
    }

    /// The rows the page shares with the CHECKED rows read the same text, and
    /// at least one is shared whenever any was asked (D13). A carried row is
    /// never an anchor (337.3 D5); a page that shares none (nothing checked)
    /// is joined by its space, width and depth alone.
    private func overlapAgrees(_ rows: [Int: ScrollbackRow], ask: ScrollbackAsk, askedEnd: Int) -> Bool {
        guard ask.overlap > 0 else { return true }
        let first = ask.keep == .top ? ask.from : Self.less(askedEnd, ask.overlap)
        var compared = 0
        for index in first..<Self.plus(first, ask.overlap) {
            guard let mine = held[index], !mine.carried else { return false }
            guard let theirs = rows[index] else { continue }
            guard theirs.row.label == mine.row.label else { return false }
            compared = Self.plus(compared, 1)
        }
        return compared > 0
    }

    // MARK: Eviction (D28)

    /// At most 3,000 rows held: the end of the held rows farther from the
    /// view goes first, back to reserved, so nothing laid out moves, and
    /// `checked` stays inside `[lo, hi]`. Answers the rows evicted.
    mutating func evict(visibleTop: Int, visibleBottom: Int) -> Int {
        var evicted = 0
        while held.count > Self.mostHeld, lo < hi {
            let above = Self.less(visibleTop, lo)
            let below = Self.less(hi, visibleBottom)
            if above >= below {
                held[lo] = nil
                lo = Self.plus(lo, 1)
                checked = max(checked, lo)
            } else {
                hi = Self.less(hi, 1)
                held[hi] = nil
                checked = min(checked, hi)
            }
            evicted = Self.plus(evicted, 1)
        }
        return evicted
    }

    // MARK: Back to live (D27; 337.3 D10)

    /// Back to `following` from `scrolled`: everything held is kept when the
    /// held rows reach the live top and paging has not stopped, so the filled
    /// look returns at once; otherwise every held and reserved row is
    /// dropped, and the next layout pass reserves the fill again. Answers the
    /// rows laid out above the live rows that it took away, for the offset's
    /// delta (0 when kept, and when already following).
    mutating func follow() -> Int {
        guard mode == .scrolled else { return 0 }
        mode = .following
        // While a refusal holds or the fill is off, following asks no page
        // (D8), so rows a pull reserved would stay the ground: none is kept
        // (and under a refusal the next pass reserves the fill's ground again,
        // so the live rows return to the bottom).
        if refusedAt == nil, !fillOff {
            if hi == live, !pagingStopped { return 0 }
        }
        let above = liveRow
        drop()
        return above
    }

    /// A page the door refused (DoorWords): scrolled, paging stops with
    /// `sentence` (337.1); following, what following holds is dropped. Either
    /// way the fill is off for this Terminal (D8).
    mutating func stop(_ sentence: String) {
        fillOff = true
        switch mode {
        case .scrolled:
            edge = .moved(sentence)
        case .following:
            drop()
        }
    }

    // MARK: Reading a row back (D31)

    /// The row at an absolute index: a live row of `picture` at and below the
    /// live top, a held row of history above it, or nil for a reserved row.
    func row(at index: Int, picture: ScreenPicture?) -> ScreenRowModel? {
        if index >= live {
            guard let picture, let place = DoorNumber.difference(index, live), picture.rows.indices.contains(place) else { return nil }
            return picture.rows[place]
        }
        return held[index]?.row
    }

    /// The absolute index of live row `place`.
    func liveIndex(_ place: Int) -> Int {
        Self.plus(live, place)
    }
}

// MARK: - The model

/// The Terminal's history while it is up: the layout, and the one page in
/// flight, at least `minGap` after the last (`checkGap` for a check), with its
/// back-off (D27, D29; 337.3 D6). The page that holds it observes `mode` and
/// `line`; the scroll view is told of every change to the layout by
/// `onLayout` and reads it in its layout pass, where it asks `fill(rows:)`.
@MainActor
@Observable
final class ScrollbackModel {
    /// At least this long between two pages (D27): 4 a second, the Mac's own
    /// floor (D14), inside the nonce budget (D29).
    static let minGap: Duration = .milliseconds(250)
    /// At least this long before a check of carried rows (337.3 D6): at most
    /// one a second while a session prints.
    static let checkGap: Duration = .seconds(1)
    /// Following, two pictures that left holes this close together are output
    /// near or past a screen a picture, not one flood, return or selection let
    /// go; then, until this long after the last such picture, following asks
    /// no page, and once one of them passed the view it carries nothing either
    /// (the Phase 337.3 verify and its fix round), so the rows above the
    /// prompt never flash, and the page that fills the view goes once it has
    /// calmed. Longer than the slowest picture's interval (400 ms ticks on
    /// another machine, the watcher's 250 ms floor and the poll's round trip),
    /// and three seconds because a shorter hold lets output whose pictures
    /// pass the view every second or two slip out of it and back, the band
    /// filling and going to the ground again: 13 to 28 times a minute at one
    /// second, 3.5 at two and 1.2 at three (measured over the shipping model
    /// and scroll view at the watcher's floor, 250 to 400 lines a second here,
    /// ten seeds). A lone one asks its page at once, so a flood or a return is
    /// filled within a round trip.
    static let outrunGap: Duration = .seconds(3)
    /// After a busy answer or a read that failed, the same page is asked
    /// again after these, the last repeating (section 5.6).
    static let retryWaits: [Duration] = [.seconds(1), .seconds(2), .seconds(4)]

    /// Observed by the page: the back-to-live button is drawn while scrolled.
    private(set) var mode: ScrollbackMode = .following
    /// Observed by the page: the scrollback line, or nil.
    private(set) var line: String?

    @ObservationIgnored private(set) var layout = ScrollbackLayout()
    /// The one page in flight, and what it asked.
    @ObservationIgnored private(set) var inFlight: Task<Void, Never>?
    @ObservationIgnored private(set) var asking: ScrollbackAsk?
    /// The gap's or the back-off's wait, and when it ends.
    @ObservationIgnored private var waiting: Task<Void, Never>?
    @ObservationIgnored private var waitingUntil: ContinuousClock.Instant?
    /// The wait is a gap's, which a sooner one replaces; a back-off's holds.
    @ObservationIgnored private var waitingForGap = false
    @ObservationIgnored private var lastStarted: ContinuousClock.Instant?
    /// When the last picture came that left holes (the layout's `outruns`
    /// moved); once one came within `outrunGap` of the one before it, until
    /// when following asks no page (`holdUntil`); and once such a picture
    /// also passed the view (its new lines more than the screen and every row
    /// the view holds above it), until when following carries nothing
    /// (`fastUntil`).
    @ObservationIgnored private var lastOutrun: ContinuousClock.Instant?
    @ObservationIgnored private var holdUntil: ContinuousClock.Instant?
    @ObservationIgnored private var fastUntil: ContinuousClock.Instant?
    @ObservationIgnored private var failures = 0
    @ObservationIgnored private var visibleTop = 0
    @ObservationIgnored private var visibleBottom = 0
    /// The rows the view holds above the live rows, from its last layout
    /// pass (337.3 D2).
    @ObservationIgnored private(set) var viewFill = 0
    /// Set while the Terminal is not on top or the app is away.
    @ObservationIgnored private(set) var stopped = false
    /// A selection is held: nothing is evicted, and pages still fill (D31).
    @ObservationIgnored var selecting = false {
        didSet { if !selecting { evictIfNeeded() } }
    }
    /// Told of every change to the layout, so the scroll view lays out again.
    @ObservationIgnored var onLayout: (@MainActor () -> Void)?

    private let door: any ScreenDoor
    private let holds: (Character) -> Bool
    private let now: @MainActor () -> ContinuousClock.Instant
    private let sleep: @Sendable (ContinuousClock.Instant) async -> Void

    init(
        door: any ScreenDoor,
        holds: @escaping (Character) -> Bool = ScreenFont.holds,
        now: @escaping @MainActor () -> ContinuousClock.Instant = { ContinuousClock.now },
        sleep: @escaping @Sendable (ContinuousClock.Instant) async -> Void = { deadline in
            try? await Task.sleep(until: deadline, clock: .continuous)
        }
    ) {
        self.door = door
        self.holds = holds
        self.now = now
        self.sleep = sleep
    }

    // MARK: What the Terminal tells it

    /// A live picture was drawn. A page in flight for an index space the
    /// picture let go is dropped (337.3 D7). Following, the view keeps the
    /// live rows' place (D11), so the rows it holds move with the live top,
    /// and the page asked here is for the rows the next layout pass reports,
    /// never the ones the last pass did (a flood's page would otherwise be
    /// asked for rows already out of view). A picture that left holes is
    /// noted. When it came within `outrunGap` of the last one, following asks
    /// no page until `outrunGap` after it (`holdUntil`): the output outruns
    /// the screen again and again, and a page would be scrolled away before
    /// it could fill anything. And when such a picture also PASSED THE VIEW
    /// (its lines more than the screen and every row the view holds above
    /// it, so whatever it carried lands above the view), or following
    /// already carries nothing, following carries nothing until then
    /// (`fast`): the rows above the prompt go to the ground once and stay
    /// there, never a strip that flashes between pictures that pass the view
    /// and pictures that fall short of it. Output that outruns the screen by
    /// less than the view keeps carrying, so the band keeps every row a
    /// picture showed.
    func picture(_ picture: ScreenPicture?) {
        guard let picture else { return }
        let held = layout.space != nil
        let outruns = layout.outruns
        let was = layout.live
        let at = now()
        layout.picture(picture, holds: holds, carrying: !fast(at))
        if layout.mode == .following, visibleTop < visibleBottom, let moved = DoorNumber.difference(layout.live, was), moved > 0 {
            visibleTop = ScrollbackLayout.plus(visibleTop, moved)
            visibleBottom = ScrollbackLayout.plus(visibleBottom, moved)
        }
        if layout.outruns != outruns {
            let passed = ScrollbackLayout.less(layout.live, was) >= ScrollbackLayout.plus(picture.rowCount, viewFill)
            if let last = lastOutrun, at < last.advanced(by: Self.outrunGap) {
                holdUntil = at.advanced(by: Self.outrunGap)
                if passed || fast(at) { fastUntil = holdUntil }
            }
            lastOutrun = at
        }
        if held, layout.space == nil { dropPage() }
        changed()
        pump()
    }

    /// The scroll view's layout pass, BEFORE it sizes the content (337.3 D2,
    /// D3): `rows` is how many rows its view holds above the live rows. The
    /// fill is reserved, the rows remembered, and a page asked when one may
    /// go; `onLayout` is not told (its caller is the layout pass) and neither
    /// observed value changes. Answers the rows reserved.
    @discardableResult
    func fill(rows: Int) -> Int {
        viewFill = rows
        let reserved = layout.reserve(visibleTop: visibleTop, fill: rows)
        pump()
        return reserved
    }

    /// The view moved: the absolute indices of its first and last rows, and
    /// whether it sits at its bottom. Following, a view off its bottom with
    /// its top above the live top enters `scrolled` (337.3 D9); then the fill
    /// or the next page may be reserved (D26), rows may be evicted, and a
    /// page may be asked. Answers the rows reserved.
    @discardableResult
    func viewed(top: Int, bottom: Int, atBottom: Bool) -> Int {
        visibleTop = top
        visibleBottom = bottom
        if layout.mode == .following, !atBottom, top < layout.live {
            layout.scroll()
            if layout.mode == .scrolled { changed() }
        }
        let reserved = layout.reserve(visibleTop: top, fill: viewFill)
        if reserved > 0 { changed() }
        evictIfNeeded()
        pump()
        return reserved
    }

    /// Back to the live terminal (D27): the back-to-live button, a drag that
    /// ended at the bottom, or a key sent. From `scrolled`, the page in flight
    /// and any wait are dropped and the layout keeps or drops what it holds
    /// (337.3 D10); already following, nothing moves, so typing never drops
    /// the fill or its page. Answers the rows dropped above the live rows.
    @discardableResult
    func follow() -> Int {
        guard layout.mode == .scrolled else { return 0 }
        dropPage()
        waiting?.cancel()
        waiting = nil
        waitingUntil = nil
        failures = 0
        let dropped = layout.follow()
        changed()
        return dropped
    }

    /// The Terminal went away or the app left: nothing more is asked.
    func stop() {
        stopped = true
        dropPage()
        waiting?.cancel()
        waiting = nil
        waitingUntil = nil
    }

    /// The Terminal is on top again.
    func resume() {
        stopped = false
        pump()
    }

    /// Join a page (D13): the layout's checks, then the cap. Every page the
    /// door answers takes this one path.
    @discardableResult
    func accept(_ page: PocketScrollbackAnswer, for ask: ScrollbackAsk) -> ScrollbackLanding {
        let landing = layout.accept(page, for: ask, holds: holds)
        if case .joined = landing {
            failures = 0
            evictIfNeeded()
        }
        changed()
        return landing
    }

    // MARK: Reading back (D31)

    /// The row at an absolute index, live or held; nil while reserved.
    func row(at index: Int, picture: ScreenPicture?) -> ScreenRowModel? {
        layout.row(at: index, picture: picture)
    }

    /// Whether every row of a selection is drawn, so Copy may be drawn: a
    /// selection that reaches reserved rows waits for them (D31).
    func drawn(_ range: ScreenSelectionRange?, picture: ScreenPicture?) -> Bool {
        guard let range else { return false }
        return ScreenSelecting.drawn(range) { self.row(at: $0, picture: picture) }
    }

    // MARK: The pages

    /// Ask the next page when one may go: none in flight, no back-off, and at
    /// least `minGap` since the last started, or `checkGap` for a check
    /// (337.3 D6), and, following while output outruns the screen picture
    /// after picture, not before the hold ends (`holdUntil`). A gap's wait gives
    /// way to a sooner one, so reserved rows in view never wait out a check's
    /// second.
    private func pump() {
        guard !stopped, inFlight == nil,
              let ask = layout.want(visibleTop: visibleTop, visibleBottom: visibleBottom) else { return }
        let gap = ask.checks ? Self.checkGap : Self.minGap
        var due = lastStarted?.advanced(by: gap)
        if layout.mode == .following, let calm = holdUntil {
            due = due.map { max($0, calm) } ?? calm
        }
        if let waiting {
            guard waitingForGap, let until = waitingUntil, let due, due < until else { return }
            waiting.cancel()
            self.waiting = nil
            waitingUntil = nil
        }
        if let due, due > now() {
            wait(until: due, forGap: true)
            return
        }
        lastStarted = now()
        asking = ask
        let door = door
        inFlight = Task { [weak self] in
            let result: Result<PocketScrollbackAnswer, Error>
            do {
                result = .success(try await door.scrollback(
                    from: ask.from, count: ask.count, depth: ask.depth, wrap: ask.wrap, keep: ask.keep
                ))
            } catch {
                result = .failure(error)
            }
            guard !Task.isCancelled else { return }
            self?.landed(result, for: ask)
        }
    }

    /// Following while output passes the view again and again: two pictures
    /// that left holes inside `outrunGap`, one of them past the screen and
    /// every row the view holds above it, until `outrunGap` after the last
    /// that left holes. The layout carries nothing meanwhile.
    private func fast(_ at: ContinuousClock.Instant) -> Bool {
        guard layout.mode == .following, let until = fastUntil else { return false }
        return at < until
    }

    /// The page in flight is let go: what it was asked for is no longer
    /// held.
    private func dropPage() {
        inFlight?.cancel()
        inFlight = nil
        asking = nil
    }

    private func landed(_ result: Result<PocketScrollbackAnswer, Error>, for ask: ScrollbackAsk) {
        inFlight = nil
        asking = nil
        switch result {
        case .success(let page):
            if accept(page, for: ask) == .busy {
                backOff()
                return
            }
        case .failure(let error):
            // The line was closed under it (the Terminal went away): asked
            // again when it is back.
            if DoorWords.isCancellation(error) { return }
            if let failure = error as? DoorFailure, failure == .refused || failure == .closedBeforeAnswer {
                layout.stop(DoorWords.scrollbackSentence(for: failure))
            } else {
                backOff()
                return
            }
        }
        changed()
        pump()
    }

    /// The same page, asked again after 1, 2, then every 4 s; nothing drawn.
    private func backOff() {
        let waits = Self.retryWaits
        let pause = waits.indices.contains(failures) ? waits[failures] : waits.last ?? .seconds(4)
        failures = ScrollbackLayout.plus(failures, 1)
        wait(until: now().advanced(by: pause), forGap: false)
    }

    private func wait(until deadline: ContinuousClock.Instant, forGap: Bool) {
        let sleep = sleep
        waitingUntil = deadline
        waitingForGap = forGap
        waiting = Task { [weak self] in
            await sleep(deadline)
            guard let self, !Task.isCancelled else { return }
            self.waiting = nil
            self.waitingUntil = nil
            self.pump()
        }
    }

    private func evictIfNeeded() {
        guard !selecting, layout.evict(visibleTop: visibleTop, visibleBottom: visibleBottom) > 0 else { return }
        changed()
    }

    /// The layout changed: the page's two observed values follow it, and the
    /// scroll view lays out again.
    private func changed() {
        if mode != layout.mode { mode = layout.mode }
        let said: String?
        if case .moved(let sentence)? = layout.edge { said = sentence } else { said = nil }
        if line != said { line = said }
        onLayout?()
    }
}
