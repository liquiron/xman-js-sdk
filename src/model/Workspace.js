import axios from 'axios'
import https from 'https'
import isPlainObject from 'lodash.isplainobject'
import ItemReferences from './ItemReferences'
import ImageReferences from './ImageReferences'

/**
 * Options for reading a list
 * @typedef ListParams
 * @property {Number} pageSize page size. Default 12. Max 24.
 * @property {String} nextPage the `nextPageToken` returned by the previous `list()` call.
 * @property {String} orderBy property path to order by, followed by direction. E.g. `name asc`
 */

class Workspace {
  constructor(clientId, workspace, stageId = 'live', cdnDomain = 'https://xman.live', secret) {
    this.clientId = clientId
    this.workspace = workspace
    this.stageId = stageId
    this.cdnDomain = cdnDomain
    this.imageBaseUrl = `${cdnDomain}/i/${workspace}/${stageId}/`
    const httpsAgent = new https.Agent({ keepAlive: true })
    const headers = {
      Authorization: 'Bearer ' + clientId
    }
    if (secret) {
      headers['XMAN-CLIENT-SECRET'] = secret
    }
    this.httpsClient = axios.create({
      baseURL: `${cdnDomain}/c/${workspace}/${stageId}/`,
      httpsAgent,
      headers
    })
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
  /**
   * 
   * @param {String} collection 
   * @param {ListParams} listParams Parameters for the list
   */
  async list (collection, listParams) {
    try {
      const response = await this.httpsClient.get(collection, {
        params: {...listParams, addHints: true}
      })
      return this.withHelpers(response.data)
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return { items: [] }
      }
      throw error
    }
  }
  async read (collection, itemId) {
    let resourceLocation = collection +'/' + itemId
    try {
      const response = await this.httpsClient.get(resourceLocation, {
        params: {
          addHints: true
        }
      })
      return this.withHelpers(response.data)
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null
      }
      throw error
    }
  }

  withHelpers (dataObject) {
    if (!dataObject) return
    if (Array.isArray(dataObject)) return dataObject.map(o => this.withHelpers(o))
    if (!isPlainObject(dataObject)) return dataObject

    return Object.entries(dataObject).reduce((result, [k, v]) => {
      const [name, type] = k.split('::')
      switch (type) {
        case 'refs':
          result[name] = new ItemReferences(v, async (c,i) => this.read(c,i))
          break;
        case 'images':
          result[name] = new ImageReferences(v, async (c,i) => this.read(c,i), this.imageBaseUrl, this.clientId)
          break;
        default:
          result[name] = this.withHelpers(v)
          break;
      }
      return result
    }, {})
  }
}

export default Workspace
