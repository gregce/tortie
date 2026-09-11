#[test]
fn one() {
    assert!(true);
}

#[tokio::test]
async fn two() {
    assert!(true);
}

fn helper() {
    let _ = 1;
}
