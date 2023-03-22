import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { rest } from 'msw'

import { getWorkspace } from '../src/index'

/** Interface for checking that the API is being called with the right values */
interface MirrorData {
  cdn: string
  workspace: string,
  stageId: string,
  collection: string,
  itemId: string,
  authHeader: string,
  secret: string
}

function mirrorRequest (cdn, req): { id: string, data: MirrorData } {
  const { workspace, stageId, collection, itemId } = req.params
  return {
    id: 'abcd',
    data: {
      cdn,
      workspace,
      stageId,
      collection,
      itemId,
      authHeader: req.headers.get('Authorization'),
      secret: req.headers.get('XMAN-CLIENT-SECRET')
    }
  }
}

const listHandlers = [
  rest.get('https://xman.live/c/:workspace/:stageId/:collection', (req, res, ctx) => {
    return res(ctx.json({ items: [mirrorRequest('https://xman.live', req)] }))
  }),
  rest.get('https://xman.live/c/:workspace/:stageId/:collection/:itemId', (req, res, ctx) => {
    return res(ctx.json(mirrorRequest('https://xman.live', req)))
  }),
  rest.get('https://dummy.xman.live/c/:workspace/:stageId/:collection/:itemId', (req, res, ctx) => {
    return res(ctx.json(mirrorRequest('https://dummy.xman.live', req)))
  })
]
const server = setupServer(...listHandlers)
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Workspace Wrapper', async () => {
  it('Incrementally builds workspace', async () => {
    let ws = getWorkspace('clientId', 'workspaceId')
    let response = await ws.read('some-collection', 'someid')
    expect(response?.data).toBeTruthy()
    expect(response?.data).toEqual({
      cdn: 'https://xman.live',
      workspace: 'workspaceId',
      stageId: 'live',
      collection: 'some-collection',
      itemId: 'someid',
      authHeader: 'Bearer clientId',
      secret: null
    })

    const ws2 = ws.stage('review')
    response = await ws2.read('some-collection', 'someid')
    expect(response?.data).toEqual({
      cdn: 'https://xman.live',
      workspace: 'workspaceId',
      stageId: 'review', // <-- Changed value
      collection: 'some-collection',
      itemId: 'someid',
      authHeader: 'Bearer clientId',
      secret: null
    })
    const ws3 = ws2.cdn('https://dummy.xman.live')
    response = await ws3.read('some-collection', 'someid')
    expect(response?.data).toEqual({
      cdn: 'https://dummy.xman.live', // <-- Changed value
      workspace: 'workspaceId',
      stageId: 'review',
      collection: 'some-collection',
      itemId: 'someid',
      authHeader: 'Bearer clientId',
      secret: null
    })
    const ws4 = ws3.secret('Xman IO is Awesome')
    response = await ws4.read('some-collection', 'someid')
    expect(response?.data).toEqual({
      cdn: 'https://dummy.xman.live',
      workspace: 'workspaceId',
      stageId: 'review',
      collection: 'some-collection',
      itemId: 'someid',
      authHeader: 'Bearer clientId',
      secret: 'Xman IO is Awesome' // <-- Changed value
    })
  })
  it('Calls the proper workspace functions', async () => {
    let ws = getWorkspace('clientId', 'workspaceId')
    let response = await ws.read<MirrorData>('some-collection', 'someid')
    expect(response?.data.collection).toBe('some-collection')
    expect(response?.data.itemId).toBe('someid')

    // List call should not have an itemId
    const listResponse = (await ws.list<MirrorData>('some-other-collection')).items[0].data
    expect(listResponse.collection).toBe('some-other-collection')
    expect(listResponse.itemId).toBeUndefined()

    response = await ws.readReferencedItem<MirrorData>([{
      collection: 'ref-collection',
      id: 'ref-item-id'
    }])
    expect(response?.data.collection).toBe('ref-collection')
    expect(response?.data.itemId).toBe('ref-item-id')

    const allRefs = await ws.readReferencedItems<MirrorData>([
      { collection: 'ref-collection', id: 'ref-item-id-1' },
      { collection: 'ref-collection', id: 'ref-item-id-2' },
    ])
    expect(allRefs.length).toBe(2)
    expect(allRefs[0].data.itemId).toBe('ref-item-id-1')
    expect(allRefs[1].data.itemId).toBe('ref-item-id-2')

    const imageItem = await ws.getImage({ collection: 'xman-assets-image-set', id: 'img-1' })
    expect(imageItem.alt).toBeFalsy()
    expect(Object.keys(imageItem.variations)).toHaveLength(1)
    expect(imageItem.variations.main.src).toBe('https://xman.live/i/workspaceId/live/img-1?xacid=clientId')

    const imageList = await ws.getImages([{ collection: 'xman-assets-image-set', id: 'img-1' }, { collection: 'xman-assets-image-set', id: 'img-2' }])
    expect(imageList).toHaveLength(2)
    expect(imageList[0].alt).toBeFalsy()
    expect(Object.keys(imageList[0].variations)).toHaveLength(1)
    expect(imageList[0].variations.main.src).toBe('https://xman.live/i/workspaceId/live/img-1?xacid=clientId')
  })
})
