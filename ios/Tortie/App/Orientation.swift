// Landscape on the Screen, and nowhere else (Phase 337, build/p337/SPEC.md D27,
// conformance:ios rule an).
//
// The Screen draws a session at the Mac's own width (his ruling 2: the phone
// never sizes it), so turning the phone sideways is how he reads it bigger.
// Every other screen stays portrait, as it always was. Info.plist lists
// portrait and both landscapes, because iOS rotates only to what it lists, and
// App/AppDelegate.swift answers, for every window, portrait unless the Screen
// is on top. The Screen alone says so, as it appears and as it goes
// (Screens/Screen.swift), and asks the window to take portrait again when it
// goes.

import UIKit

@MainActor
enum OrientationGate {
    /// The Screen is on top. Set in Screens/Screen.swift's appear and
    /// disappear, and nowhere else.
    static var screenOnTop = false

    /// What the app allows now: portrait, or the Screen's landscapes too.
    static var allowed: UIInterfaceOrientationMask {
        screenOnTop ? .allButUpsideDown : .portrait
    }

    /// Ask each window to take what is allowed now: back to portrait when the
    /// Screen went.
    static func apply() {
        for scene in UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }) {
            for window in scene.windows {
                window.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
            }
            if !screenOnTop {
                scene.requestGeometryUpdate(.iOS(interfaceOrientations: .portrait))
            }
        }
    }
}
