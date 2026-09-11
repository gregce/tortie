use std::process::Command;

fn main() {
    let args = ["rev-parse", "HEAD"];
    let output = Command::new("git").args(args).output();
    let _ = output;
}
