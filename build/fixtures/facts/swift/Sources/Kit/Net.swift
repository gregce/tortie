import Foundation

public enum Net {
    public static func reach() {
        let task = URLSession.shared.dataTask(with: URL(string: "https://api.example/v1")!)
        task.resume()
        Process().launch()
        Thread {
            print("bg")
        }
    }
}
