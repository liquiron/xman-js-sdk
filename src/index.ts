import { ListParams, ListResponse, Workspace, XmanItem, XmanItemReference, ImageSettings, HTMLImageData } from './Workspace.js'
// export { version } from '../package.json' assert { type: 'json' }
/* c8 ignore next 1 */
export { ListParams, ListResponse, XmanItem, XmanItemReference, ImageSettings, HTMLImageData }

export interface WorkspaceWrapper {
  /**
   * Reads a specific item. *Returns `null` if item is not found*
   * @param {string} collection collection ID (e.g. xman-articles)
   * @param {string} itemId 20 character Item ID (e.g. dXEFNfms7zlMI8AdbFND)
   * @returns {Promise<XmanItem<T> | null>} an item or `null`
   */
  read<T> (collection: string, itemId: string): Promise<XmanItem<T> | null>;

  /**
   * Loads and returns the first referenced item in the reference list. If the list is empty, returns null
   * 
   * @param referenceFieldValue {XmanItemReference[]} field value of a reference field. Use directly from the response of previous calls
   * @returns {Promise<XmanItem<T> | null>} First referenced item or `null` if no items referenced
   */
  readReferencedItem<T> (referenceFieldValue?: XmanItemReference[]): Promise<XmanItem<T> | null>;
  /**
   * Loads and returns all the referenced items in the reference list. If the list is empty, returns [].
   * This method ignores all items that fail to load. E.g. The API Client you created may not have access to some collections
   * If you want the call to fail when such errors happen, pass `failOnPartialFailure = true`
   * 
   * @param referenceFieldValue {XmanItemReference[]} field value of a reference field. Use directly from the response of previous calls
   * @param failOnPartialFailure {boolean} if `true` throws an error if any item reference throws an error
   * @returns {[Promise<XmanItem<T>]} First referenced item or `null` if no items referenced
   * @throws Error when `failOnPartialFailure = true` and one or more items fail to load
   */
  readReferencedItems<T> (referenceFieldValue?: XmanItemReference[], failOnPartialFailure?: boolean): Promise<XmanItem<T>[]>;
  /**
   * Read a list of items. Simple paging and sorting is supported.
   * 
   * Use `query()` for more sophisticated queries
   * 
   * @param {string} collection 
   * @param {ListParams?} listParams Parameters for the list
   */
  list<T> (collection: string, listParams?: ListParams): Promise<ListResponse<T>>;
  /**
   * Generates alt text and image URLs for a set of image references.
   * 
   * @param {XmanItemReference[]} imgRefs pointers to image items. You can use the reference field values directly
   * @param {ImageSettings?} imageSettings image settings
   * @returns Promise<HTMLImageData[]> list of image details
   */
  getImages (imgRefs: XmanItemReference[], imageSettings?: ImageSettings[]): Promise<HTMLImageData[]>;
  /**
   * Generates alt text and image URLs for one image reference
   * 
   * @param {XmanItemReference} imgRef pointers to an image item. You can use the reference field value directly
   * @param {ImageSettings?} imageSettings image settings
   * @returns Promise<HTMLImageData> image details
   */
  getImage (imgRef: XmanItemReference, imageSettings?: ImageSettings[]): Promise<HTMLImageData>;
  /**
   * Change the stage to pull data from. Default is 'live'
   * @param {String} stageName 
   */
  stage (stageName?: string): WorkspaceWrapper;
  /**
   * Point to a separate delivery CDN.
   * Only applicable to "Environment" plans.
   * 
   * @param {String} cdnServer CDN Server URL
   */
  cdn (cdnServer?: string): WorkspaceWrapper;
  /**
   * Provide the secret part of the key for server side access without `Origin` check
   * *DO NOT USE IN A CLIENT SIDE WEB APP*
   * Please use in server only settings for SSR apps such as NuxtJS, NextJS, Gatsby, etc.
   * 
   * @param {String} secret for server side access.
   */
  secret (secret: string): WorkspaceWrapper;
}

/**
 * 
 * @param clientId API client ID from XMan I/O
 * @param workspaceId Workspace ID. You can see this in the URL on XMan I/O
 * @param stageName 'live' by default
 * @param cdnServer Ignore. Unless Liquiron support has asked you to set this
 * @param secret Secret for server side access. DO NOT USE ON IN THE BROWSER
 * @returns Workspace object
 */
export const getWorkspace = (
  clientId: string,
  workspaceId: string,
  stageName = 'live',
  cdnServer = 'https://xman.live',
  secret?: string): WorkspaceWrapper => {

  const ws = new Workspace(clientId, workspaceId, stageName, cdnServer, secret)

  return {
    read: (collection, itemId) => ws.read(collection, itemId),
    readReferencedItem: (rf) => ws.readReferencedItem(rf),
    readReferencedItems: (rf, failOnPartialFailure?) => ws.readReferencedItems(rf, failOnPartialFailure),
    getImages: (imgRefs, imageSettings?) => ws.getImages(imgRefs, imageSettings),
    getImage: (imgRef, imageSettings) => ws.getImage(imgRef, imageSettings),
    list: (collection, listParams) => ws.list(collection, listParams),
    stage (stageName = 'live'): WorkspaceWrapper {
      return getWorkspace(clientId, workspaceId, stageName, cdnServer, secret)
    },
    cdn (cdnServer = 'https://xman.live'): WorkspaceWrapper {
      return getWorkspace(clientId, workspaceId, stageName, cdnServer, secret)
    },
    secret (secret: string): WorkspaceWrapper {
      return getWorkspace(clientId, workspaceId, stageName, cdnServer, secret)
    }
  }
}
