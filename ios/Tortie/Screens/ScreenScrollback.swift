// The Terminal's history: what the phone holds of what a session printed,
// where each row of it is laid out, and which page to ask for next (Phase
// 337.1, build/p3371/SPEC.md D13, D25 to D28, D31 and section 5.5.4).
//
// HIS RULING. "Yes, scroll back on the Screen": his Phase 316 refusal of the
// raw terminal scrollback is lifted for the Terminal. He scrolls up and the
// terminal scrolls back through what the session printed, as far as the Mac
// keeps it, while the live rows at the bottom keep updating.
//
// THE INDEX SPACE IS TMUX'S OWN (D2): line `i` of a session's history, 0 being
// the oldest line tmux holds, keeps its index while lines scroll in under it,
// and the live screen's top row is index `depth`, which each live picture
// carries with the pane's `space` (D3). A page is asked by index and answered
// with the depth, the width and the space it was read at (D7, D8).
//
// THE LAYOUT (`ScrollbackLayout`, pure; D25). It covers indices `[top, H)` of
// history, then the live rows at `[H, H + rows)`; `H` is the live picture's
// depth, the last one that was a number. Of the history rows, `[lo, hi)` are
// HELD and every other one is RESERVED, drawn as the ground until its page
// lands. Every row is one cell tall, so a row's place is `(index - top)` rows.
//
// RESERVE FIRST, FILL LATER (D26). Rows are reserved above before they are
// fetched, never inserted where he looks: entering `scrolled` reserves the
// first page at once, and a view whose top comes within one page of `top`
// reserves the next; `reserve(visibleTop:)` is THE ONE PLACE `top` MOVES, and
// it answers the rows it reserved, which the scroll view adds to its offset
// in the same layout pass (Screens/ScreenScroller.swift). A page then FILLS
// reserved rows and moves nothing; the live picture growing `H` grows the
// reserved rows between `hi` and the live rows, below him; eviction turns held
// rows back into reserved ones; none of the three changes where a row of
// history is laid out.
//
// TWO MODES (D27). `following`: nothing held, the live rows alone. `scrolled`:
// his place kept. The back-to-live button, a drag that ends at the bottom, or
// any key he sends returns to `following` and drops every held and reserved
// row. While `scrolled`, every live picture's depth raises `depthSeen`, so a
// trim is seen within one picture.
//
// EVERY PAGE IS VERIFIED BEFORE IT IS JOINED (D13): its `space` and `wrap` are
// the ones held, its `depth` is at least `depthSeen`, it answers the rows
// asked, and the rows it shares with the held ones (8 at the edge it adjoins)
// read the same text. Anything else stops paging with `Earlier lines changed
// on your Mac. Go back to the live terminal to read them again.` until he goes
// back to the live terminal, which reads it all again.
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
    /// The live rows alone; nothing held.
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
    /// the live picture's own line says why.
    case stopped
    /// The oldest line tmux holds is held: above it, nothing.
    case atOldest
}

/// One row of history the phone holds: laid out once, with the style table of
/// the page it came in.
struct ScrollbackRow: Equatable, Sendable {
    let row: ScreenRowModel
    let styles: [ScreenStyle]
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
    /// The rows of the page the phone already holds: at its bottom for an
    /// older page, at its top for a newer one, none for the first.
    let overlap: Int
}

/// What a page came to.
enum ScrollbackLanding: Equatable, Sendable {
    /// Joined: the reserved rows it filled.
    case joined(Int)
    /// The index space moved, by main's word or the phone's own check.
    case moved
    /// The Mac was busy: the same page is asked again after its back-off.
    case busy
    /// The session ended or could not be read: paging stops.
    case stopped
    /// It arrived after he went back to the live terminal.
    case ignored
}

// MARK: - The layout (pure)

/// Where every row of the Terminal is, and what is held (D25 to D28). Pure:
/// no clock, no door, no view.
struct ScrollbackLayout: Equatable, Sendable {
    /// Rows a page asks for, and rows reserved at a time (D26, D27).
    static let pageRows = 100
    /// Rows a page shares with the ones held, at the edge it adjoins (D13).
    static let overlapRows = 8
    /// The most rows of history held (D28).
    static let mostHeld = 3_000

    /// The live picture's index space, which entering `scrolled` takes: nil
    /// while the picture offers none (the alternate screen, an unsteady read,
    /// a Mac older than 337.1).
    struct Offer: Equatable, Sendable {
        let depth: Int
        let space: String
        let columns: Int
    }

    private(set) var mode: ScrollbackMode = .following
    /// The first index laid out while `scrolled`. It moves in
    /// `reserve(visibleTop:)` alone.
    private(set) var top = 0
    /// `H`: the index of the live top row, from the last live picture whose
    /// depth was a number.
    private(set) var live = 0
    /// The live screen's rows.
    private(set) var liveRows = 0
    /// The rows held, by index: exactly `[lo, hi)`.
    private(set) var held: [Int: ScrollbackRow] = [:]
    private(set) var lo = 0
    private(set) var hi = 0
    /// The newest history size seen in this index space (D27).
    private(set) var depthSeen = 0
    /// The index space held: the width it was read at and its pane.
    private(set) var wrap = 0
    private(set) var space: String?
    private(set) var edge: ScrollbackEdge?
    /// What the newest live picture offers.
    private(set) var offered: Offer?
    /// The rows a page shares with the held ones: 8, or 1 after a page that
    /// was so cut it brought nothing new (every cell its own colour), so the
    /// next one does.
    private(set) var overlapWanted = ScrollbackLayout.overlapRows

    /// The first index laid out: `top` while `scrolled`, the live top while
    /// `following`.
    var firstRow: Int { mode == .scrolled ? top : live }
    /// The live top row's place, in rows from the first.
    var liveRow: Int { Self.less(live, firstRow) }
    /// Every row laid out: history (held or reserved), then the live rows.
    var rowCount: Int { Self.plus(liveRow, liveRows) }
    /// Paging has stopped until `following`.
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

    /// A live picture landed. Following, the live rows are placed at its
    /// depth. Scrolled, a numeric depth in the held index space raises
    /// `depthSeen` and moves the live rows down by the lines that scrolled in,
    /// below him; another space, another width or a shallower history stops
    /// paging; a picture on the alternate screen returns to `following` (the
    /// program covered the history); a null depth leaves the live rows where
    /// the last number put them (section 5.6).
    mutating func picture(_ picture: ScreenPicture) {
        liveRows = picture.rowCount
        if picture.alternate {
            offered = nil
        } else if let depth = picture.historyDepth, let space = picture.space {
            offered = Offer(depth: depth, space: space, columns: picture.columns)
        } else {
            offered = nil
        }
        switch mode {
        case .following:
            if let depth = picture.historyDepth { live = depth }
        case .scrolled:
            if picture.alternate {
                _ = follow()
                return
            }
            guard !pagingStopped, let offer = offered else { return }
            guard offer.space == space, offer.columns == wrap, offer.depth >= depthSeen else {
                edge = .moved(Copy.scrollbackMoved)
                return
            }
            depthSeen = offer.depth
            live = max(live, offer.depth)
        }
    }

    // MARK: Reserving (D26)

    /// THE ONE PLACE `top` MOVES. Following, a view whose top is above the
    /// live top enters `scrolled` and reserves the first page above the live
    /// rows at once; scrolled, a view whose top is within one page of `top`
    /// reserves the next page, never below 0. Answers the rows reserved, which
    /// the scroll view adds to its offset in the same pass (D26).
    mutating func reserve(visibleTop: Int) -> Int {
        let from: Int
        switch mode {
        case .following:
            guard let offer = offered, offer.depth > 0, visibleTop < live else { return 0 }
            mode = .scrolled
            space = offer.space
            wrap = offer.columns
            depthSeen = offer.depth
            live = offer.depth
            held = [:]
            lo = offer.depth
            hi = offer.depth
            edge = nil
            overlapWanted = Self.overlapRows
            from = offer.depth
        case .scrolled:
            guard !pagingStopped, top > 0, visibleTop < Self.plus(top, Self.pageRows) else { return 0 }
            from = top
        }
        let reached = Self.less(from, Self.pageRows)
        top = reached
        return Self.less(from, reached)
    }

    // MARK: The next page (D27)

    /// The ONE next page to ask, or none: only for reserved rows in view and
    /// one page beyond each edge of them, a page ADJOINING the held rows when
    /// any are held, and never past `depthSeen`.
    func want(visibleTop: Int, visibleBottom: Int) -> ScrollbackAsk? {
        guard mode == .scrolled, !pagingStopped, top < live else { return nil }
        let reachTop = max(top, Self.less(visibleTop, Self.pageRows))
        let reachBottom = min(live, Self.plus(visibleBottom, Self.pageRows))
        guard reachTop < reachBottom else { return nil }
        guard lo < hi else {
            // The first page: the rows just above the live screen.
            let from = Self.less(live, Self.pageRows)
            return ask(from: from, count: Self.less(live, from), keep: .bottom, overlap: 0)
        }
        let overlap = min(overlapWanted, Self.less(hi, lo))
        let olderInView = max(top, visibleTop) < min(lo, visibleBottom)
        let newerInView = max(hi, visibleTop) < min(live, visibleBottom)
        let older = reachTop < lo
        let newer = hi < reachBottom
        if olderInView || (older && !newerInView) {
            let from = max(top, Self.less(lo, Self.pageRows))
            return ask(from: from, count: Self.plus(Self.less(lo, from), overlap), keep: .bottom, overlap: overlap)
        }
        if newerInView || newer {
            let from = Self.less(hi, overlap)
            let fresh = min(Self.pageRows, Self.less(live, hi))
            return ask(from: from, count: Self.plus(fresh, overlap), keep: .top, overlap: overlap)
        }
        return nil
    }

    /// An ask, checked: at least one new row, at most a page's rows, and never
    /// past the newest depth the phone saw (D7: a page past the top of the
    /// phone's own index space is no page).
    private func ask(from: Int, count: Int, keep: ScrollbackKeep, overlap: Int) -> ScrollbackAsk? {
        guard count > overlap, count <= PocketScrollbackAnswer.mostRows,
              let end = DoorNumber.sum(from, count), end <= depthSeen else { return nil }
        return ScrollbackAsk(from: from, count: count, depth: depthSeen, wrap: wrap, keep: keep, overlap: overlap)
    }

    // MARK: A page (D13)

    /// A page landed for `ask`. It is joined only when its index space is the
    /// one held, its depth at least `depthSeen`, it answers the rows asked,
    /// and the rows it shares with the held ones read the same; it then FILLS
    /// reserved rows and the layout's height does not change. Anything else
    /// stops paging until `following`.
    mutating func accept(_ page: PocketScrollbackAnswer, for ask: ScrollbackAsk, holds: (Character) -> Bool = ScreenFont.holds) -> ScrollbackLanding {
        guard mode == .scrolled, !pagingStopped else { return .ignored }
        if let why = page.why {
            switch why {
            case .busy:
                return .busy
            case .moved:
                edge = .moved(page.sentence ?? Copy.scrollbackMoved)
                return .moved
            case .ended, .unreachable:
                edge = .stopped
                return .stopped
            }
        }
        guard let from = page.pageFrom, let depth = page.pageDepth, page.pageWrap == wrap, page.space == space,
              depth >= depthSeen, !page.rows.isEmpty, page.rows.count <= ask.count,
              let end = DoorNumber.sum(from, page.rows.count), let asked = DoorNumber.sum(ask.from, ask.count),
              Self.answers(from: from, end: end, asked: ask, askedEnd: asked) else {
            edge = .moved(Copy.scrollbackMoved)
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
        guard overlapAgrees(rows, ask: ask, askedEnd: asked) else {
            edge = .moved(Copy.scrollbackMoved)
            return .moved
        }
        let fresh = rows.keys.filter { held[$0] == nil }.count
        for (index, row) in rows where held[index] == nil {
            held[index] = row
        }
        if lo < hi {
            lo = min(lo, from)
            hi = max(hi, end)
        } else {
            lo = from
            hi = end
        }
        depthSeen = max(depthSeen, depth)
        overlapWanted = fresh > 0 ? Self.overlapRows : 1
        if lo == 0, edge == nil { edge = .atOldest }
        return .joined(fresh)
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

    /// The rows the page shares with the held ones read the same text, and
    /// at least one is shared whenever any was asked (D13). The first page
    /// shares none.
    private func overlapAgrees(_ rows: [Int: ScrollbackRow], ask: ScrollbackAsk, askedEnd: Int) -> Bool {
        guard ask.overlap > 0 else { return true }
        let first = ask.keep == .top ? ask.from : Self.less(askedEnd, ask.overlap)
        var compared = 0
        for index in first..<Self.plus(first, ask.overlap) {
            guard let mine = held[index] else { return false }
            guard let theirs = rows[index] else { continue }
            guard theirs.row.label == mine.row.label else { return false }
            compared = Self.plus(compared, 1)
        }
        return compared > 0
    }

    // MARK: Eviction (D28)

    /// At most 3,000 rows held: the end of the held rows farther from the
    /// view goes first, back to reserved, so nothing laid out moves. Answers
    /// the rows evicted.
    mutating func evict(visibleTop: Int, visibleBottom: Int) -> Int {
        var evicted = 0
        while held.count > Self.mostHeld, lo < hi {
            let above = Self.less(visibleTop, lo)
            let below = Self.less(hi, visibleBottom)
            if above >= below {
                held[lo] = nil
                lo = Self.plus(lo, 1)
            } else {
                hi = Self.less(hi, 1)
                held[hi] = nil
            }
            evicted = Self.plus(evicted, 1)
        }
        return evicted
    }

    // MARK: Back to live (D27)

    /// Back to `following`: every held and reserved row dropped. Answers the
    /// rows that were laid out above the live rows, for the offset delta.
    mutating func follow() -> Int {
        let dropped = mode == .scrolled ? Self.less(live, top) : 0
        mode = .following
        held = [:]
        lo = 0
        hi = 0
        edge = nil
        overlapWanted = Self.overlapRows
        return dropped
    }

    /// Stop paging with a sentence: a page was refused (DoorWords).
    mutating func stop(_ sentence: String) {
        guard mode == .scrolled else { return }
        edge = .moved(sentence)
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
/// flight, at least `minGap` after the last, with its back-off (D27, D29).
/// The page that holds it observes `mode` and `line`; the scroll view is told
/// of every change to the layout by `onLayout` and reads it in its layout pass.
@MainActor
@Observable
final class ScrollbackModel {
    /// At least this long between two pages (D27): 4 a second, the Mac's own
    /// floor (D14), inside the nonce budget (D29).
    static let minGap: Duration = .milliseconds(250)
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
    /// The gap's or the back-off's wait.
    @ObservationIgnored private var waiting: Task<Void, Never>?
    @ObservationIgnored private var lastStarted: ContinuousClock.Instant?
    @ObservationIgnored private var failures = 0
    @ObservationIgnored private var visibleTop = 0
    @ObservationIgnored private var visibleBottom = 0
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

    /// A live picture was drawn.
    func picture(_ picture: ScreenPicture?) {
        guard let picture else { return }
        layout.picture(picture)
        changed()
        pump()
    }

    /// The view moved: the absolute indices of its first and last rows. It
    /// may enter `scrolled` or reserve the next page (D26), may evict, and
    /// may ask a page. Answers the rows reserved.
    @discardableResult
    func viewed(top: Int, bottom: Int) -> Int {
        visibleTop = top
        visibleBottom = bottom
        let reserved = layout.reserve(visibleTop: top)
        if reserved > 0 { changed() }
        evictIfNeeded()
        pump()
        return reserved
    }

    /// Back to the live terminal (D27): the back-to-live button, a drag that
    /// ended at the bottom, or a key sent. The page in flight and any wait
    /// are dropped. Answers the rows dropped above the live rows.
    @discardableResult
    func follow() -> Int {
        inFlight?.cancel()
        inFlight = nil
        asking = nil
        waiting?.cancel()
        waiting = nil
        failures = 0
        let dropped = layout.follow()
        changed()
        return dropped
    }

    /// The Terminal went away or the app left: nothing more is asked.
    func stop() {
        stopped = true
        inFlight?.cancel()
        inFlight = nil
        asking = nil
        waiting?.cancel()
        waiting = nil
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

    /// Ask the next page when one may go: none in flight, no wait, at least
    /// `minGap` since the last started.
    private func pump() {
        guard !stopped, inFlight == nil, waiting == nil,
              let ask = layout.want(visibleTop: visibleTop, visibleBottom: visibleBottom) else { return }
        if let started = lastStarted, started.advanced(by: Self.minGap) > now() {
            wait(until: started.advanced(by: Self.minGap))
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
        wait(until: now().advanced(by: pause))
    }

    private func wait(until deadline: ContinuousClock.Instant) {
        let sleep = sleep
        waiting = Task { [weak self] in
            await sleep(deadline)
            guard let self, !Task.isCancelled else { return }
            self.waiting = nil
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
