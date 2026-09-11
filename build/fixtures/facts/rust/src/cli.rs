use clap::{Arg, Command};

pub fn app() -> Command {
    let cmd = Command::new("rg").arg("--json").arg("--count");
    cmd.arg(Arg::new("pattern"))
}
