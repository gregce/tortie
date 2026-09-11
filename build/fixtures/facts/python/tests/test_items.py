import pytest
import requests


def test_a():
    assert True


@pytest.mark.parametrize("x", [1, 2])
def test_b(x):
    assert x > 0


def test_c():
    r = requests.get("https://example.test/items")
    assert r.status_code == 200
    assert authenticated_user.hashed_password.startswith("$argon2")
    assert r.request.headers['Authorization'].startswith('Digest ')
