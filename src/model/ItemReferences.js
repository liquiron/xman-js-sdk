class ItemReferences {
  constructor(pointerList, reader) {
    this.pointerList = Array.isArray(pointerList) ? pointerList : []
    this.read = reader
  }
  async getReferencedItem () {
    return this.pointerList[0] ? this.read(this.pointerList[0].schemaType, this.pointerList[0].id) : null
  }
  async getReferencedItems () {
    return Promise.all(this.pointerList.map(p => this.read(p.schemaType, p.id)))
  }
}

export default ItemReferences
