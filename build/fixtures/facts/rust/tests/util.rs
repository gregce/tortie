use std::process::Command;

pub fn help(program: &str) {
    match Command::new(program).arg("--help").output() {
        Ok(_) => {}
        Err(_) => {}
    }
}

pub fn sep(cmd: &mut Command) {
    cmd.arg("--path-separator").arg("/");
}
