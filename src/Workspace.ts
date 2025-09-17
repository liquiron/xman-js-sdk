import axios, { AxiosInstance, RawAxiosRequestHeaders } from 'axios'
import { Agent } from 'https'
import { ListParams, XmanItemsList, XmanItem, XmanFieldValue, ImageSettings, HTMLImageData } from './xman-types.js'

export class Workspace {
  clientId: string
  workspace: string
  stageId: string
  cdnDomain: string
  imageBaseUrl: string
  secret?: string
  _httpsClient: AxiosInstance | null

  constructor(clientId: string, workspace: string, stageId = 'live', cdnDomain = 'https://xman.live', secret?: string) {
    this.clientId = clientId
    this.workspace = workspace
    this.stageId = stageId
    this.cdnDomain = cdnDomain
    this.imageBaseUrl = `${cdnDomain}/i/${workspace}/${stageId}/`
    this.secret = secret
    this._httpsClient = null
  }

  private getHttpClient (): AxiosInstance {
    if (this._httpsClient) return this._httpsClient
    const httpsAgent = new Agent({ keepAlive: true })
    const headers: RawAxiosRequestHeaders = {
      Authorization: 'Bearer ' + this.clientId
    }
    if (this.secret) {
      headers['XMAN-CLIENT-SECRET'] = this.secret
    }
    this._httpsClient = axios.create({
      baseURL: `${this.cdnDomain}/c/${this.workspace}/${this.stageId}/`,
      httpsAgent,
      headers
    })
    return this._httpsClient
    // In rare cases. To log
    // this.httpsClient.interceptors.request.use(request => {
    //   console.log('Starting Request', request)
    //   return request
    // })
    // this.httpsClient.interceptors.response.use(response => {
    //   console.log('Response:', response)
    //   return response
    // })
  }
  async list<T> (collection: any, listParams: ListParams = {}): Promise<XmanItemsList<T>> {
    try {
      const response = await this.getHttpClient().get<XmanItemsList<T>>(collection, {
        params: { ...listParams }
      })
      return response.data
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        // List API never returns a 404.
        // Only time you get a 404 is when the CDN is incorrect
        throw new Error(error.message)
      } else {
        throw error
      }
    }
  }

  async read<T> (collection: string, itemId: string): Promise<XmanItem<T> | null> {
    let resourceLocation = collection + '/' + itemId
    try {
      const response = await this.getHttpClient().get<XmanItem<T>>(resourceLocation)
      return response.data
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) return null
        throw new Error(error.message)
      } else {
        throw error
      }
    }
  }

  async readReferencedItem<T> (referenceFieldValue?: XmanFieldValue.Reference[]): Promise<XmanItem<T> | null> {
    if (!Array.isArray(referenceFieldValue)) return null
    if (referenceFieldValue.length === 0) return null
    return this.read(referenceFieldValue[0].collection, referenceFieldValue[0].id)
  }

  async readReferencedItems<T> (referenceFieldValue?: XmanFieldValue.Reference[], failOnPartialFailure?: boolean): Promise<XmanItem<T>[]> {
    if (!Array.isArray(referenceFieldValue)) return []
    const goodPointers = referenceFieldValue.filter(v => v && v.collection && v.id)
    const settledPromises = await Promise.allSettled(goodPointers.map(rv => this.read(rv.collection, rv.id)))
    const fulfilledPromises = settledPromises.filter(v => v.status === 'fulfilled' && Boolean(v.value))
    if (failOnPartialFailure && settledPromises.length !== fulfilledPromises.length) {
      const rejectedPromises = settledPromises.filter(p => p.status === 'rejected')
        .map(p => p.reason?.message)
        .join(';')
      throw new Error(rejectedPromises)
    }
    //@ts-expect-error TS doesn't understand that the filter removes failed
    return fulfilledPromises.map(v => v.value)

  }

  /**
   * Generates alt text and image URLs for a set of image references.
   * 
   * @param {XmanFieldValue.Reference[]} imgRefs pointers to image items. You can use the reference field values directly
   * @param {ImageSettings?} imageSettings image settings
   * @returns Promise<HTMLImageData[]> list of image details
   */
  async getImages (imgRefs: XmanFieldValue.Reference[], imageSettings?: ImageSettings[]): Promise<HTMLImageData[]> {
    return Promise.all(imgRefs.map(p => this.getImage(p, imageSettings)))
  }
  async getImage (imgRef: XmanFieldValue.Reference, imageSettings: ImageSettings[] = [{ key: 'main' }]): Promise<HTMLImageData> {
    if (!imgRef) throw new Error('Invalid Image Reference')
    const { collection, id } = imgRef
    if (!collection || !id) throw new Error('Invalid Image Reference')
    const imageItem = await this.read<XmanImage>(imgRef.collection, imgRef.id)
    // TODO: include blurhash in the pointer and use it if image fails to load
    // Or figure out how to fail gracefully
    let alt = imageItem?.data.altText || imgRef.altText || imgRef.label || ''
    const imgBaseUrl = this.imageBaseUrl + imgRef.id
    const variations = imageSettings.reduce((pv, imageSetting) => {
      const imgUrl = new URL(imgBaseUrl)
      const { key, width, height, fit } = imageSetting
      if (!key) throw new Error('key is required for each image setting')
      if (width) imgUrl.searchParams.set('width', `${width}`)
      if (height) imgUrl.searchParams.set('height', `${height}`)
      if (fit) imgUrl.searchParams.set('fit', fit)
      imgUrl.searchParams.set('xacid', this.clientId)
      const imageVariation: any = { src: imgUrl.href }
      if (width) imageVariation.width = width
      if (height) imageVariation.height = height
      // Fit is only for the server. So not passing back
      return {
        [key]: imageVariation,
        ...pv
      }
    }, {})
    return { alt, variations }
  }

}

interface XmanImage {
  masterImage: XmanFieldValue.File
  altText?: string
  name?: string
  description?: string
  labels?: string[]
  startTime?: string
  endTime?: string
}
