import ItemReferences from './ItemReferences'

class ImageReferences extends ItemReferences {
  constructor (pointerList, reader, imageBaseUrl, clientId) {
    super(pointerList, reader)
    this.imageBaseUrl = imageBaseUrl
    this.clientId = clientId
  }
  /**
   * @typedef ImageSettings
   * @property {Number} width image width. Cannot be larger than actual image width
   * @property {Number} height image height. Cannot be larger than the actual image height
   * @property {String} fit one of *`cover`, `fill`, `contain`
   * 
   * @param {ImageSettings} imageSettings image settings
   * @returns Promise<{altText: string; url: string;}> image details
   */
  async getImage (imageSettings) {
    if (this.pointerList[0]) {
      return this.buildImage(this.pointerList[0], imageSettings)
    }
  }
  /**
   * @param {ImageSettings} imageSettings image settings
   * @returns Promise<{altText: string; url: string;}[]> list of image details
   */
  async getImages (imageSettings) {
    return Promise.all(this.pointerList.map(p => this.buildImage(p, imageSettings)))
  }
  async buildImage (imgRef, imageSettings = {}) {
    const imgUrl = new URL(this.imageBaseUrl + imgRef.id)
    const { width, height } = imageSettings
    if (width) imgUrl.searchParams.set('width', width)
    if (height) imgUrl.searchParams.set('height', height)
    imgUrl.searchParams.set('xacid', this.clientId)
    return {altText: imgRef.label, url: imgUrl.href}
  }
}

export default ImageReferences
