// The person's pasteboard, saved before a probe copies and put back after.
//
// Phase 209. A probe that presses command C for real replaces whatever the
// operator had on the system pasteboard, and pbpaste and pbcopy only carry the
// text flavour, so an image or a rich flavour he had would be gone. This
// saves every flavour of every item byte for byte and restores them, and
// `info` prints the flavours and their sizes so a probe can prove the
// pasteboard after is the pasteboard before. Compiled by the probe into its
// own scratch directory with swiftc, never shipped.
//
//   pb save <dir>     write every item's flavours under <dir>
//   pb restore <dir>  put them back, replacing what is there now
//   pb info           one line per flavour: item, type, bytes

import AppKit
import Foundation

let args = CommandLine.arguments

func die(_ message: String) -> Never {
  FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
  exit(2)
}

if args.count < 2 { die("usage: pb save <dir> | pb restore <dir> | pb info") }
let pasteboard = NSPasteboard.general

switch args[1] {
case "info":
  var out: [String] = ["changeCount=\(pasteboard.changeCount)"]
  for (i, item) in (pasteboard.pasteboardItems ?? []).enumerated() {
    for type in item.types {
      let n = item.data(forType: type)?.count ?? -1
      out.append("item\(i) \(type.rawValue) \(n)")
    }
  }
  print(out.joined(separator: "\n"))
case "save":
  if args.count < 3 { die("save needs a directory") }
  let dir = URL(fileURLWithPath: args[2])
  try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
  var manifest: [[String]] = []
  for (i, item) in (pasteboard.pasteboardItems ?? []).enumerated() {
    var types: [String] = []
    for (j, type) in item.types.enumerated() {
      guard let data = item.data(forType: type) else { continue }
      let file = dir.appendingPathComponent("\(i)-\(j).bin")
      do { try data.write(to: file) } catch { die("could not write \(file.path)") }
      types.append(type.rawValue + "\t" + file.path)
    }
    manifest.append(types)
  }
  let text = manifest.map { $0.joined(separator: "\n") }.joined(separator: "\n--item--\n")
  do {
    try text.write(to: dir.appendingPathComponent("manifest.txt"), atomically: true, encoding: .utf8)
  } catch {
    die("could not write the manifest")
  }
  print("saved \(manifest.count) item(s), changeCount=\(pasteboard.changeCount)")
case "restore":
  if args.count < 3 { die("restore needs a directory") }
  let dir = URL(fileURLWithPath: args[2])
  guard let text = try? String(contentsOf: dir.appendingPathComponent("manifest.txt"), encoding: .utf8) else {
    die("no manifest under \(dir.path)")
  }
  var items: [NSPasteboardItem] = []
  if !text.isEmpty {
    for block in text.components(separatedBy: "\n--item--\n") {
      let item = NSPasteboardItem()
      for line in block.split(separator: "\n") {
        let parts = line.split(separator: "\t", maxSplits: 1).map(String.init)
        if parts.count != 2 { continue }
        guard let data = try? Data(contentsOf: URL(fileURLWithPath: parts[1])) else { continue }
        item.setData(data, forType: NSPasteboard.PasteboardType(parts[0]))
      }
      items.append(item)
    }
  }
  pasteboard.clearContents()
  if !items.isEmpty { pasteboard.writeObjects(items) }
  print("restored \(items.count) item(s), changeCount=\(pasteboard.changeCount)")
default:
  die("unknown verb \(args[1])")
}
