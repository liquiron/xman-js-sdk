import { ListParams, XmanItemsList, XmanItem, XmanFieldValue, ImageSettings, HTMLImageData, DecisionInputs, MoadeDecisionResult, EventPayload, AnalyticsInstance, TrackerFunction } from './xman-types.js'
import { isNull, isUndefined, omitBy, isEmpty, set } from 'lodash'

export type ProxyResult<T> =
  | { success: true, data: T }
  | { success: false, response: Response }

export const DEFAULT_MOADE_SERVER = 'https://moade.xman.live'
export const DEFAULT_XMAN_SERVER = 'https://xman.live'
export const DEFAULT_STAGE = 'live'

const removeNulls = (o: any) => omitBy(o, v => isUndefined(v) || isNull(v))
export class Workspace {
  clientId: string
  workspace: string
  stageId: string
  cdnServer: string
  moadeServer: string
  imageBaseUrl: string
  secret?: string

  constructor(clientId: string, workspace: string, stageId = DEFAULT_STAGE, cdnServer = DEFAULT_XMAN_SERVER, moadeServer = DEFAULT_MOADE_SERVER, secret?: string) {
    this.clientId = clientId
    this.workspace = workspace
    this.stageId = stageId
    this.cdnServer = cdnServer
    this.moadeServer = moadeServer
    this.imageBaseUrl = `${cdnServer}/i/${workspace}/${stageId}/`
    this.secret = secret
  }

  private async fetchContent<T> (itemPath: string, params?: any): Promise<ProxyResult<T>> {

    const headers = this.getAuthHeaders()
    let path = `${this.cdnServer}/c/${this.workspace}/${this.stageId}/${itemPath}`
    if (params) path = `${path}?${new URLSearchParams(params)}`
    const response = await fetch(path, {
      method: 'GET',
      headers
    })
    if (!response.ok) {
      const errorMessage = `XMan Response Status: ${response.status} message: ${await response.text()}`
      console.log(errorMessage)
      return { success: false, response }
    }
    const data: T = await response.json() as T
    return { success: true, data }
  }

  private getAuthHeaders (): Headers {
    const headers = new Headers()
    headers.set('Authorization', 'Bearer ' + this.clientId)
    if (this.secret) {
      headers.set('XMAN-CLIENT-SECRET', this.secret)
    }
    return headers
  }

  getMoadeTracker (fixedEventName?: string, reportCampaign = false): TrackerFunction {
    return ({ payload, instance }: { payload: EventPayload, instance: AnalyticsInstance }) => {
      const eventName = fixedEventName ?? payload?.event ?? 'unspecified_event'
      const { userId, anonymousId, properties } = payload
      const headers = this.getAuthHeaders()
      headers.set('Content-Type', 'text/plain;charset=UTF-8')
      const path = `${this.moadeServer}/event/${this.workspace}/${this.stageId}`
      const body = removeNulls({ userId, anonymousId, properties, eventName })

      if (reportCampaign) {
        const state = instance?.getState()
        const campaign = state?.context?.campaign
        if (!isEmpty(campaign)) { set(body, 'properties.campaign', campaign) }
      }
      fetch(path, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        mode: 'no-cors'
      }).then(() => {
        // console.log('Done')
      }).catch(error => {
        console.error('Error sending analytics event:', error);
      })
    }
  }
  async decide (decisionFlowId: string, decisionInputs: DecisionInputs): Promise<ProxyResult<MoadeDecisionResult>> {
    const headers = this.getAuthHeaders()
    headers.set('Content-Type', 'application/json')
    const path = `${this.moadeServer}/decider`
    const response = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        workspace: this.workspace,
        stage: this.stageId,
        pid: decisionFlowId,
        uid: decisionInputs.userId || decisionInputs.anonymousId
      })
    })
    if (!response.ok) {
      const errorMessage = `XMan Response Status: ${response.status} message: ${await response.text()}`
      console.log(errorMessage)
      return { success: false, response }
    }
    const data: MoadeDecisionResult = await response.json() as MoadeDecisionResult
    return { success: true, data }
  }
  async list<T> (collection: any, listParams: ListParams = {}): Promise<XmanItemsList<T>> {
    const result = await this.fetchContent<XmanItemsList<T>>(collection, listParams)
    if (result.success) return result.data
    throw new Error(`XMan Response Status: ${result.response.status} message: ${await result.response.text()}`)
  }

  async read<T> (collection: string, itemId: string): Promise<XmanItem<T> | null> {
    const result = await this.fetchContent<XmanItem<T>>(collection + '/' + itemId)
    if (result.success) return result.data
    if (result.response.status === 404) return null
    throw new Error(`XMan Response Status: ${result.response.status} message: ${await result.response.text()}`)
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
