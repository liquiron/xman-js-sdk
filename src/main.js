import Workspace from './model/Workspace'
import {version} from '../package.json'

const getWorkspace = (clientId, workspaceId, stageName = 'live', cdnServer = 'https://xman.live', secret) => {
  const ws = new Workspace(clientId, workspaceId, stageName, cdnServer, secret)
  return {
    /**
     * Reads a specific item
     * @param {String} collection collection ID (e.g. xman-articles)
     * @param {String} itemId 20 character Item ID (e.g. dXEFNfms7zlMI8AdbFND)
     */
    async read (collection, itemId) {
      return ws.read(collection, itemId)
    },
    /**
     * Options for reading a list
     * @typedef {Object} ListParams
     * @property {Number} pageSize page size. Default 12. Max 24.
     * @property {String} nextPage the `nextPageToken` returned by the previous `list()` call.
     * @property {String} orderBy property path to order by, followed by direction. E.g. `name asc`
     */
    /**
     * Read a list of items. Simple paging and sorting is supported.
     * 
     * Use `query()` for more sophisticated queries
     * 
     * @param {String} collection 
     * @param {ListParams} listParams Parameters for the list
     */
    async list (collection, listParams) {
      return ws.list(collection, listParams)
    },
    /**
     * Change the stage to pull data from. Default is 'live'
     * @param {String} stageName 
     */
    stage (stageName = 'live') {
      return getWorkspace(clientId, workspaceId, stageName, cdnServer, secret)
    },
    /**
     * Point to a separate delivery CDN.
     * Only applicable to "Environment" plans.
     * 
     * @param {String} cdnServer CDN Server URL
     */
    cdn (cdnServer = 'https://xman.live') {
      return getWorkspace(clientId, workspaceId, stageName, cdnServer, secret)
    },
    /**
     * Provide the secret part of the key for server side access without `Origin` check
     * *DO NOT USE IN A CLIENT SIDE WEB APP*
     * Please use in server only settings for SSR apps such as NuxtJS, NextJS, Gatsby, etc.
     * 
     * @param {String} secret for server side access.
     */
    secret (secret) {
      return getWorkspace(clientId, workspaceId, stageName, cdnServer, secret)
    }
  }
}

export default {
  getWorkspace,
  version: version
}
