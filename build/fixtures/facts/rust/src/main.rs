fn main() {
    let out = std::process::Command::new("git").output();
    let _ = out;
}
