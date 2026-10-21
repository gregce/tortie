// Settings: the paired Mac, what iOS allows for alerts, the version, and
// Unpair this iPhone (Phase 316.6, build/p3166/SPEC.md section 5.3).
//
// docs/design/phone/Settings.html, frame for frame: house cards, not a system
// list, so the frames are the mock's. Unpair's question is
// docs/design/phone/Unpair.html.
//
// GROUPED, LIKE THE IPHONE'S OWN SETTINGS (Phase 348, build/p348/SPEC.md §4.3,
// D12; his words "redesign the settings screen on the phone to make it look
// better"). An inset grouped page of the house pieces under the system's
// large title: each group one card, with its raised header above it and its
// footer under it, the rows inside a card parted by a hairline that starts at
// the text column, today's rows in today's order. Four rows start with an SF
// Symbol in the secondary colour and no tile (the Mac's name, Notifications,
// Pair another Mac, See a sample); Paired is a labelled row as Version is;
// `Pair again to get alerts.` and the sentence under Unpair are their groups'
// footers. Every row that presses is at least as tall as before, the whole
// card row pressing, and nothing new is said.
//
// IT READS NOTHING FROM THE DOOR. Everything here is the pairing the app
// already holds in memory (`DoorReading.facts`, public fields only), the list's
// last answer (its `read 4:32 PM`), what iOS allows (asked by the app, behind
// the pairing's own `macSends`, App/TortieApp.swift), and the app's own bundle.
//
// WHAT IT NEVER SAYS. The Alerts card is drawn only for a Mac that said it can
// send (Phase 316.5's `sends`), and it says what iOS allows, never that alerts
// are "on": the phone cannot see the Mac's switch. Its row opens iOS Settings
// at Tortie's notifications, a system constant, and it is the one address this
// file ever opens itself. There is no Face ID switch (his ruling of
// 2026-09-30: End always asks, and a switch before End exists is "dormant").
//
// ABOUT (Phase 333.1, build/p3331/SPEC.md D22) adds three rows under the
// version: Tortie for Mac (tortie.sh), Privacy and Support. Each press is a
// named method that hands a `SiteLink` to the site opener (Markdown/Links.swift),
// which asks the link policy and opens it; this file opens no page itself.
//
// UNPAIR forgets the pairing on this iPhone only. The Mac keeps listing the
// phone until he presses Remove there; its half is Phase 317's, and the
// question says so in the Mac's own words.
//
// SEE A SAMPLE (Phase 333.3, build/p3333/SPEC.md D13, D18). A paired phone
// has a row of its own under Unpair, See a sample, which opens the made-up
// sessions with the pairing untouched. Inside the sample Settings draws its
// title and About alone: no paired Mac, no Alerts card, no Unpair (which would
// forget a real pairing from inside a made-up one) and no See a sample. Leave
// sample is in the strip above every page.
//
// SEVERAL MACS (Phase 345, build/p345/SPEC.md D15). Settings is the Mac on
// screen's: its This Mac card (its name drawn as the Macs tab draws it, D21),
// its Alerts card when IT said it could send, then Pair another Mac, which
// opens the pairing screen as a sheet over the lists, then Unpair this iPhone,
// which forgets the Mac on screen and no other. With one Mac kept the one new
// thing is the Pair another Mac row.

import SwiftUI
import UIKit

// MARK: - What Settings draws, decided before anything is laid out

/// The whole screen, as drawn. Pure, so the tests read every line of it with
/// nothing on screen.
struct SettingsDrawing: Equatable {
    /// The paired Mac, or nil when no pairing is held.
    let facts: PairedFacts?
    /// The Mac's name as the card draws it: its drawn name among the Macs
    /// kept (Phase 345, D21), else the facts' own; nil with no facts.
    let macName: String?
    /// `read 4:32 PM` from the list's last loaded answer, or nil.
    let readLine: String?
    /// The day this iPhone paired, `Sep 30, 2026`, drawn on the right of the
    /// `Paired` row (Phase 348, D12), or nil.
    let pairedDate: String?
    /// What iOS allows, or nil when the Alerts card is NOT drawn, which is
    /// for every pairing whose Mac did not say it could send.
    let notificationsState: String?
    /// `Pair again to get alerts.` when the list says it, the Alerts group's
    /// footer; never without the group.
    let alertsLine: String?
    /// The sentence under Unpair when the phone could not forget, its group's
    /// footer, or nil.
    let unpairLine: String?
    /// `1.0.0 (4)`.
    let version: String

    init(
        facts: PairedFacts?,
        list: ListState?,
        alertsLine: String?,
        permission: PushAuthorization?,
        settingsLine: String?,
        info: [String: Any]?,
        drawnName: String? = nil,
        date: (Double) -> String = PairedClock.date
    ) {
        self.facts = facts
        macName = facts.map { drawnName ?? $0.name }
        if case .loaded(let drawing)? = list {
            readLine = drawing.readLine
        } else {
            readLine = nil
        }
        pairedDate = facts.map { date($0.pairedAt) }
        let sends = facts?.macSends ?? false
        notificationsState = sends ? Self.permissionWord(permission) : nil
        self.alertsLine = sends ? alertsLine : nil
        unpairLine = settingsLine
        version = AppVersion.line(info)
    }

    /// What iOS allows, in the phone's own words; a dash before it is read.
    static func permissionWord(_ permission: PushAuthorization?) -> String {
        switch permission {
        case .authorized: Copy.notificationsAllowed
        case .denied: Copy.notificationsOff
        case .notDetermined: Copy.notificationsNotAsked
        case nil: Copy.dash
        }
    }
}

/// The app's own version and build, from its bundle: `1.0.0 (4)`, a dash for
/// either one the bundle does not say.
enum AppVersion {
    static let marketingKey = "CFBundleShortVersionString"
    static let buildKey = "CFBundleVersion"

    static func line(_ info: [String: Any]?) -> String {
        let marketing = info?[marketingKey] as? String
        let build = info?[buildKey] as? String
        return Copy.versionLine(nonEmpty(marketing) ?? Copy.dash, nonEmpty(build) ?? Copy.dash)
    }

    private static func nonEmpty(_ text: String?) -> String? {
        guard let text, !text.isEmpty else { return nil }
        return text
    }
}

/// The day this iPhone paired, in the phone's own date format, no time: a
/// moment, not an age, so nothing is subtracted.
enum PairedClock {
    static func date(_ epochMs: Double) -> String {
        Date(timeIntervalSince1970: epochMs / 1000).formatted(date: .abbreviated, time: .omitted)
    }
}

// MARK: - The screen

struct SettingsScreen: View {
    let app: AppModel
    /// Tortie's own site. The app hands `SiteOpener`; a test hands its own.
    let site: any SiteOpening
    /// Unpair's question is up.
    @State private var asking = false

    init(app: AppModel, site: any SiteOpening = SiteOpener()) {
        self.app = app
        self.site = site
    }

    /// What the screen draws. Inside the sample, no facts: the sample's
    /// reader holds none, and nothing here may read as a Mac (D18).
    var drawing: SettingsDrawing {
        SettingsDrawing(
            facts: app.inSample ? nil : app.reader?.facts,
            list: app.list?.state,
            alertsLine: app.list?.alertsLine,
            permission: app.alertPermission,
            settingsLine: app.settingsLine,
            info: Bundle.main.infoDictionary,
            drawnName: app.chosen.map { app.drawnName($0) }
        )
    }

    var body: some View {
        let drawing = drawing
        ScrollView {
            VStack(alignment: .leading, spacing: SettingsFrame.groupGap) {
                if let facts = drawing.facts {
                    macGroup(facts, drawing: drawing)
                }
                if let state = drawing.notificationsState {
                    alertsGroup(state: state, line: drawing.alertsLine)
                }
                let rows = rows
                if rows.pairAnother {
                    pairAnotherRow
                }
                if rows.unpair {
                    unpairGroup(line: drawing.unpairLine)
                }
                if rows.seeSample {
                    seeSampleRow
                }
                aboutCard(drawing.version)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, Frame.gutter)
            .padding(.top, SettingsFrame.underTitle)
            .padding(.bottom, Frame.gutter)
        }
        .scrollIndicators(.hidden)
        .background(Tokens.bgSidebar.ignoresSafeArea())
        .task { await app.readAlertPermission() }
        .confirmationDialog(Copy.unpairQuestion, isPresented: $asking, titleVisibility: .visible) {
            Button(Copy.unpair, role: .destructive) { app.unpair() }
            Button(Copy.cancel, role: .cancel) {}
        } message: {
            Text(verbatim: Copy.unpairNote)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.settingsScreen)
        .navigationTitle(Copy.settings)
        .navigationBarTitleDisplayMode(.large)
        .toolbarBackground(Tokens.bgSidebar, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    // MARK: The groups, in today's order (Phase 348, D12)

    /// This Mac (Settings.html's first group): its name past the Mac's
    /// symbol, its public name and port in monospace, and when the list last
    /// read; the fingerprint exactly as Pairing drew it; and the day it
    /// paired, a labelled row as Version is. Every row's words start at the
    /// group's one text column, the symbol's column left blank where a row
    /// has none.
    private func macGroup(_ facts: PairedFacts, drawing: SettingsDrawing) -> some View {
        group(header: Copy.thisMac) {
            HStack(alignment: .top, spacing: SettingsFrame.symbolGap) {
                symbol(SettingsSymbol.mac)
                    .frame(height: Face.lead.lineHeight)
                VStack(alignment: .leading, spacing: 0) {
                    Words(drawing.macName ?? facts.name, .lead, Tokens.textPrimary)
                        .lineBox(.lead)
                        .accessibilityIdentifier(ID.settingsMacName)
                    Text(verbatim: facts.address)
                        .font(.system(size: Face.secondary.size, design: .monospaced))
                        .foregroundStyle(Tokens.textSecondary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                        .lineBox(.secondary)
                        .accessibilityIdentifier(ID.settingsMacAddress)
                        .padding(.top, 2)
                    if let read = drawing.readLine {
                        Words(read, .age, Tokens.textMuted)
                            .lineBox(.age)
                            .accessibilityIdentifier(ID.settingsMacRead)
                            .padding(.top, 2)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, Frame.cardPadding)
            .padding(.vertical, SettingsFrame.linesVertical)
            rowLine(symbols: true)
            HStack(alignment: .top, spacing: SettingsFrame.symbolGap) {
                symbolSpace
                VStack(alignment: .leading, spacing: 0) {
                    RaisedLabel(Copy.pairMatchLabel)
                        .accessibilityIdentifier(ID.settingsMatch)
                    Text(verbatim: facts.fingerprint)
                        .font(.system(size: Face.fingerprint.size, design: .monospaced))
                        .monospacedDigit()
                        .foregroundStyle(Tokens.textPrimary)
                        .lineSpacing(Face.fingerprint.spacing)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier(ID.settingsFingerprint)
                        .padding(.top, 6)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, Frame.cardPadding)
            .padding(.vertical, SettingsFrame.linesVertical)
            if let paired = drawing.pairedDate {
                rowLine(symbols: true)
                HStack(spacing: SettingsFrame.symbolGap) {
                    symbolSpace
                    HStack(spacing: Frame.rowGap) {
                        Words(Copy.paired, .body, Tokens.textPrimary)
                            .lineBox(.body)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Words(paired, .body, Tokens.textSecondary)
                            .lineBox(.body)
                            .fixedSize()
                            .accessibilityIdentifier(ID.settingsPaired)
                    }
                }
                .frame(minHeight: SettingsFrame.lineHeight)
                .padding(.horizontal, Frame.cardPadding)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.settingsMac)
    }

    /// Alerts, only for a Mac that said it can send: one 44-tall row past the
    /// bell's symbol saying what iOS allows, which opens iOS Settings, and
    /// `Pair again to get alerts.` as the group's footer when the list says
    /// so. The row is ONE element that contains its state, so the state is
    /// read inside it.
    private func alertsGroup(state: String, line: String?) -> some View {
        group(header: Copy.alerts, footer: line.map { GroupFooter(words: $0, id: ID.settingsAlertsLine) }) {
            HStack(spacing: SettingsFrame.symbolGap) {
                symbol(SettingsSymbol.notifications)
                HStack(spacing: Frame.rowGap) {
                    Words(Copy.notifications, .body, Tokens.textPrimary)
                        .lineBox(.body)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Words(state, .body, Tokens.textSecondary)
                        .lineBox(.body)
                        .fixedSize()
                        .accessibilityIdentifier(ID.settingsNotificationsState)
                    Chevron()
                }
            }
            .padding(.horizontal, Frame.cardPadding)
            .frame(minHeight: SettingsFrame.lineHeight)
            .contentShape(Rectangle())
            .onTapGesture(perform: openNotificationSettings)
            .accessibilityElement(children: .contain)
            .accessibilityAddTraits(.isButton)
            .accessibilityIdentifier(ID.settingsNotifications)
            .accessibilityAction(.default, openNotificationSettings)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.settingsAlerts)
    }

    /// Unpair this iPhone, in a group of its own: one 54-tall row in the
    /// error colour, left aligned, which asks first; the sentence the phone
    /// draws when it could not forget is the group's footer.
    private func unpairGroup(line: String?) -> some View {
        group(footer: line.map { GroupFooter(words: $0, id: ID.settingsUnpairLine) }) {
            unpairRow
        }
    }

    /// Unpair's row: the whole card row presses, and nothing is padded
    /// outside it.
    private var unpairRow: some View {
        Button {
            asking = true
        } label: {
            Words(Copy.unpairThisIPhone, .body, Tokens.error)
                .lineBox(.body)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, Frame.cardPadding)
                .frame(height: Frame.linkRowHeight)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier(ID.settingsUnpair)
    }

    /// Which of Settings' own rows are drawn where the app is now (D13, D18).
    var rows: SettingsRows {
        SettingsRows(root: app.root)
    }

    /// Pair another Mac (Phase 345, D15), a group of its own: one 54-tall row
    /// past its symbol, with the chevron of a row that opens something, under
    /// the Mac's groups and above Unpair. It opens the pairing screen as a
    /// sheet over the lists, and the Macs kept stay kept.
    private var pairAnotherRow: some View {
        group {
            Button(action: pairAnother) {
                HStack(spacing: SettingsFrame.symbolGap) {
                    symbol(SettingsSymbol.pairAnother)
                    HStack(spacing: Frame.rowGap) {
                        Words(Copy.pairAnotherMac, .body, Tokens.textPrimary)
                            .lineBox(.body)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Chevron()
                    }
                }
                .padding(.horizontal, Frame.cardPadding)
                .frame(height: Frame.linkRowHeight)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier(ID.settingsPairAnother)
        }
    }

    /// Pair another Mac's press: the app opens its sheet (Phase 345).
    func pairAnother() {
        app.pairAnotherMac()
    }

    /// See a sample, for a paired phone, a group of its own: one 54-tall row
    /// past its symbol, the body's colour and the chevron of a row that opens
    /// something, directly under Unpair and its line (Phase 333.3, D13).
    private var seeSampleRow: some View {
        group {
            Button(action: openSample) {
                HStack(spacing: SettingsFrame.symbolGap) {
                    symbol(SettingsSymbol.seeSample)
                    HStack(spacing: Frame.rowGap) {
                        Words(Copy.seeSample, .body, Tokens.textPrimary)
                            .lineBox(.body)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Chevron()
                    }
                }
                .padding(.horizontal, Frame.cardPadding)
                .frame(height: Frame.linkRowHeight)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier(ID.settingsSeeSample)
        }
    }

    /// See a sample's press: the app opens it (Phase 333.3).
    func openSample() {
        app.openSample()
    }

    /// About: the app's version and build, then the three pages of Tortie's
    /// own site, each a row at least 44 tall (Phase 333.1, D22), a hairline
    /// between two rows from the text column to the card's edge.
    private func aboutCard(_ version: String) -> some View {
        group(header: Copy.about) {
            HStack(spacing: Frame.rowGap) {
                Words(Copy.version, .body, Tokens.textPrimary)
                    .lineBox(.body)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Words(version, SettingsFrame.versionFace, Tokens.textSecondary)
                    .lineBox(SettingsFrame.versionFace)
                    .fixedSize()
                    .accessibilityIdentifier(ID.settingsVersion)
            }
            .frame(minHeight: SettingsFrame.lineHeight)
            .padding(.horizontal, Frame.cardPadding)
            rowLine(symbols: false)
            Button(action: openMacSite) {
                siteRow(Copy.macOnSite) {
                    Words(Copy.siteName, .body, Tokens.textSecondary)
                        .lineBox(.body)
                        .fixedSize()
                        .accessibilityIdentifier(ID.settingsMacSiteName)
                }
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier(ID.settingsMacSite)
            rowLine(symbols: false)
            Button(action: openPrivacy) {
                siteRow(Copy.privacy) { EmptyView() }
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier(ID.settingsPrivacy)
            rowLine(symbols: false)
            Button(action: openSupport) {
                siteRow(Copy.support) { EmptyView() }
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier(ID.settingsSupport)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(ID.settingsAbout)
    }

    /// One of About's site rows: its words, what it says on the right, and
    /// the chevron of a row that opens something; the whole card row presses.
    private func siteRow(_ words: String, @ViewBuilder trailing: () -> some View) -> some View {
        HStack(spacing: Frame.rowGap) {
            Words(words, .body, Tokens.textPrimary)
                .lineBox(.body)
                .frame(maxWidth: .infinity, alignment: .leading)
            trailing()
            Chevron()
        }
        .frame(minHeight: SettingsFrame.lineHeight)
        .padding(.horizontal, Frame.cardPadding)
        .contentShape(Rectangle())
    }

    // MARK: The house pieces a group is drawn with (Phase 348, D12)

    /// One group of the page, the iPhone's own grouped Settings drawn with the
    /// house pieces and never a system list: an optional header raised above
    /// its card, the card holding the group's rows, and an optional footer
    /// under it. A group that is one element is made so where it is drawn.
    private func group<Rows: View>(
        header: String? = nil,
        footer: GroupFooter? = nil,
        @ViewBuilder rows: () -> Rows
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if let header {
                RaisedLabel(header)
                    .padding(.horizontal, Frame.cardPadding)
                    .padding(.bottom, SettingsFrame.headerGap)
            }
            VStack(alignment: .leading, spacing: 0) {
                rows()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .card()
            if let footer {
                Words(footer.words, .secondary, Tokens.textSecondary, lines: nil)
                    .accessibilityIdentifier(footer.id)
                    .padding(.horizontal, Frame.cardPadding)
                    .padding(.top, SettingsFrame.footerGap)
            }
        }
    }

    /// A row's symbol (D12): an SF Symbol in the secondary text colour, with
    /// no tile, hidden from VoiceOver, in a column of one width, so the words
    /// of every row in its group start at one text column.
    private func symbol(_ name: String) -> some View {
        Image(systemName: name)
            .font(Face.body.font)
            .foregroundStyle(Tokens.textSecondary)
            .frame(width: SettingsFrame.symbolColumn)
            .accessibilityHidden(true)
    }

    /// The symbol's column with no symbol in it, for a row of a group whose
    /// first row has one.
    private var symbolSpace: some View {
        Color.clear
            .frame(width: SettingsFrame.symbolColumn, height: Frame.hairline)
            .accessibilityHidden(true)
    }

    /// The hairline between two rows of a card, from the group's text column
    /// to the card's trailing edge: past the symbol's column when the group's
    /// rows carry symbols.
    private func rowLine(symbols: Bool) -> some View {
        HStack(spacing: SettingsFrame.symbolGap) {
            if symbols {
                symbolSpace
            }
            Hairline()
        }
        .padding(.leading, Frame.cardPadding)
    }

    // MARK: Tortie's own site, one named press each (D21)

    /// Tortie for Mac: the Mac app's page.
    func openMacSite() {
        site.open(.home)
    }

    /// Privacy.
    func openPrivacy() {
        site.open(.privacy)
    }

    /// Support.
    func openSupport() {
        site.open(.support)
    }

    /// iOS Settings, at Tortie's notifications: a system constant, never an
    /// address anyone wrote, and the only address this screen opens itself.
    private func openNotificationSettings() {
        guard let url = URL(string: UIApplication.openNotificationSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}

/// A group's footer: its words, and the identifier they are read by.
private struct GroupFooter {
    let words: String
    let id: String
}

/// The four symbols Settings draws (Phase 348, D12), by SF Symbols' own names:
/// the Mac's name row, Notifications, Pair another Mac and See a sample.
private enum SettingsSymbol {
    static let mac = "desktopcomputer"
    static let notifications = "bell.badge"
    static let pairAnother = "plus.circle"
    static let seeSample = "eye"
}

/// Which of Settings' own rows are drawn, by where the app is (Phase 333.3,
/// D13, D18): Unpair everywhere but inside the sample, and See a sample only
/// for a paired phone, never inside the sample itself; and Pair another Mac
/// (Phase 345, D15) only for a paired phone, never inside the sample.
struct SettingsRows: Equatable {
    let unpair: Bool
    let seeSample: Bool
    let pairAnother: Bool

    init(root: AppModel.Root) {
        unpair = root != .sample
        seeSample = root == .reading
        pairAnother = root == .reading
    }
}

/// The lengths Settings.html spells that the other mocks do not.
private enum SettingsFrame {
    /// A row inside a card (`.line { min-height: 44px }`).
    static let lineHeight: CGFloat = 44
    /// `1.0.0 (4)`: 17/22, tabular.
    static let versionFace = Face(17, line: 22, tabular: true)
    /// Between two groups (`.grp + .grp { margin-top: 24px }`).
    static let groupGap: CGFloat = 24
    /// Between a group's raised header and its card (`.ghdr { padding: 0 16px 6px }`).
    static let headerGap: CGFloat = 6
    /// Between a card and its footer (`.gfoot { padding: 6px 16px 0 }`).
    static let footerGap: CGFloat = 6
    /// A row's symbol column and the gap after it (`.sym { width: 28px;
    /// margin-right: 12px }`): the group's text column starts past both.
    static let symbolColumn: CGFloat = 28
    static let symbolGap: CGFloat = 12
    /// Above and below a row of lines that does not press (`padding: 12px 16px`).
    static let linesVertical: CGFloat = 12
    /// Between the large title and the first group, as the title row's own
    /// `padding: 0 16px 8px` held it before the bar drew the title.
    static let underTitle: CGFloat = 8
}
