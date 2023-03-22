import axios, { AxiosInstance, RawAxiosRequestHeaders } from 'axios'
import { Agent } from 'https'

/**
 * Options for reading a list
 */
export interface ListParams {
  /** in page size. Default 12. Max 24. */
  pageSize?: number,
  /** the `nextPageToken` returned by the previous `list()` call. */
  nextPage?: string,
  /** property path to order by, followed by direction. E.g. `name asc` */
  orderBy?: string
}

export interface XmanItemReference {
  collection: string,
  id: string,
  /** Label is cached at the time reference is created. Not updated with the item changes. */
  label?: string
  altText?: string
  thumbId?: string
}

export interface XmanItem<T> {
  id: string
  data: T,
  createTime: string,
  updateTime: string,
  version: number
}

export interface ListResponse<T> {
  items: XmanItem<T>[],
  nextPageToken?: string
}

export interface ImageSettings {
  /** 
   * Key to identify the variation of the image.
   * `getImage(s)` will return variations in a map keyed by this key
   * */
  key: string
  /** Image width. If larger than actual image width, actual width is used */
  width?: number
  /** Image height. If larger than actual image height, actual height is used */
  height?: number
  fit?: 'cover' | 'fill' | 'contain'
}

export interface HTMLImageData {
  alt: string,
  variations: {
    [key: string]: {
      src: string,
      width?: number,
      height?: number
    }
  }
}

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
  async list<T> (collection: any, listParams: ListParams = {}): Promise<ListResponse<T>> {
    try {
      const response = await this.getHttpClient().get<ListResponse<T>>(collection, {
        params: { ...listParams, addHints: false }
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
      const response = await this.getHttpClient().get<XmanItem<T>>(resourceLocation, {
        params: {
          addHints: false
        }
      })
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

  async readReferencedItem<T> (referenceFieldValue?: XmanItemReference[]): Promise<XmanItem<T> | null> {
    if (!Array.isArray(referenceFieldValue)) return null
    if (referenceFieldValue.length === 0) return null
    return this.read(referenceFieldValue[0].collection, referenceFieldValue[0].id)
  }

  async readReferencedItems<T> (referenceFieldValue?: XmanItemReference[], failOnPartialFailure?: boolean): Promise<XmanItem<T>[]> {
    if (!Array.isArray(referenceFieldValue)) return []
    const goodPointers = referenceFieldValue.filter(v => v && v.collection && v.id)
    const settledPromises = await Promise.allSettled(goodPointers.map(rv => this.read(rv.collection, rv.id)))
    const fulfilledPromises = settledPromises.filter(v => v.status === 'fulfilled' && Boolean(v.value))
    if (failOnPartialFailure && settledPromises.length !== fulfilledPromises.length) {
      const rejectedPromises = settledPromises.filter(p => p.status === 'rejected')
        //@ts-expect-error TS doesn't understand that the filter removes fulfilled
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
   * @param {XmanItemReference[]} imgRefs pointers to image items. You can use the reference field values directly
   * @param {ImageSettings?} imageSettings image settings
   * @returns Promise<HTMLImageData[]> list of image details
   */
  async getImages (imgRefs: XmanItemReference[], imageSettings?: ImageSettings[]): Promise<HTMLImageData[]> {
    return Promise.all(imgRefs.map(p => this.getImage(p, imageSettings)))
  }
  async getImage (imgRef: XmanItemReference, imageSettings: ImageSettings[] = [{ key: 'main' }]): Promise<HTMLImageData> {
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

interface XmanFile {
  contentType: string,
  name: string,
  storageName: string,
  md5Hash: string,
  size: number,
  publicUrl: string
}

interface XmanImage {
  masterImage: XmanFile
  altText?: string
  name?: string
  description?: string
  labels?: string[]
  startTime?: string
  endTime?: string
}
