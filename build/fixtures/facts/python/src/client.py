import requests


def fetch():
    return requests.get("https://api.example/v1")


def build(url):
    # Phase 261 item 6, class 2. A CONSTRUCTION reached by a call rather than
    # by `new`: it reaches nothing until a session sends it, which is the
    # `requests` half of the refusal Phase 257 already made for Go's
    # `&http.Request{}`. Decoy: no fact under network.client.
    r = requests.Request("GET", url)
    # The control beside it, and the reason the refusal is CASE SENSITIVE:
    # lower case `request` is a real reach and must keep firing.
    requests.request("GET", url)
    return r
