from fastapi import APIRouter

router = APIRouter()


@router.get("/items", response_model=list)
def list_items():
    return []


@router.post("/items", status_code=201)
def create_item():
    return {}


@router.put("/items/{id}", response_model=dict)
def replace_item(id: int):
    return {}


@router.patch("/items/{id}", response_model=dict)
def patch_item(id: int):
    return {}


@router.delete("/items/{id}", status_code=204)
def delete_item(id: int):
    return None
