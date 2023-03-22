import { expect, describe, it, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { rest } from 'msw'
import { mockTags } from './mock-data/xman-tags.json' assert { type: 'json'}
import { Workspace } from '../src/Workspace'
import { ImageSettings } from '../src/xman-types'
import { XmanFieldValue } from '../src/xman-types'
const m = {
  cdn: 'https://dummy.cdn',
  workspace: 'dummy-workspace',
  clientId: 'clientId',
  serverToken: 'good-token',
  stage: 'stg1'
}
const testUrlPrefix = `${m.cdn}/c/${m.workspace}/${m.stage}`

const listHandlers = [
  rest.get(`${testUrlPrefix}/requires-server-token`, (req, res, ctx) => {
    if (req.headers.get('XMAN-CLIENT-SECRET') === 'good-token') {
      return res(ctx.json(mockTags))
    } else {
      return res(ctx.status(403), ctx.text('Wrong server token'))
    }
  }),
  rest.get(`${testUrlPrefix}/requires-bearer`, (req, res, ctx) => {
    if (req.headers.get('Authorization') === 'Bearer ' + m.clientId) {
      return res(ctx.json(mockTags))
    } else {
      return res(ctx.status(403), ctx.text('Wrong client ID'))
    }
  }),
  rest.get('https://wrong.cdn/*', (req, res, ctx) => {
    return res(ctx.status(404), ctx.text('Not found'))
  }),
  rest.get(`${testUrlPrefix}/xman-tag`, (req, res, ctx) => {
    return res(ctx.json(mockTags))
  }),
  rest.get(`${testUrlPrefix}/wrong-collection*`, (req, res, ctx) => {
    return res(ctx.status(403), ctx.text('This API Client is not allowed to read this collection'))
  }),
  rest.get(`${testUrlPrefix}/xman-tag/:tagId`, (req, res, ctx) => {
    const { tagId } = req.params
    const tag = mockTags.items.find(v => v.id === tagId)
    if (tag) return res(ctx.json(tag))
    return res(ctx.status(404), ctx.text(`Not found 123. Make sure item is published to stage: ${m.stage}`))
  }),
  rest.get(`${testUrlPrefix}/xman-assets-image-set/:imageId`, (req, res, ctx) => {
    const { imageId } = req.params
    return res(ctx.json({
      id: imageId,
      data: {
        altText: 'Alt for ' + imageId
      }
    }))
  })
]

const server = setupServer(...listHandlers)
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Workspace', async () => {
  const ws = new Workspace(m.clientId, m.workspace, m.stage, m.cdn)
  describe('Key Settings', async () => {
    it('Throws error with wrong CDN', async () => {
      const wsWithWrongCDN = new Workspace(m.clientId, m.workspace, m.stage, 'https://wrong.cdn', m.serverToken)
      const itemsCall = async () => { await wsWithWrongCDN.list('xman-tag') }
      await expect(itemsCall).rejects.toThrowError()
    })
    it('Sets secret key', async () => {
      const itemsCall = async () => { await ws.list('requires-server-token') }
      await expect(itemsCall).rejects.toThrowError()
      const wsWithToken = new Workspace(m.clientId, m.workspace, m.stage, m.cdn, m.serverToken)
      const tagsList = await wsWithToken.list('requires-server-token')
      expect(tagsList.items.length).toBe(6)
    })
    it('Sets client ID', async () => {
      const tagsList = await ws.list('requires-bearer')
      expect(tagsList.items.length).toBe(6)
      const wsWithWrongClient = new Workspace('wrong client', m.workspace, m.stage, m.cdn, m.serverToken)
      const itemsCall = async () => { await wsWithWrongClient.list('requires-bearer') }
      await expect(itemsCall).rejects.toThrowError()
    })
  })
  describe('List', async () => {
    it('Lists items', async () => {
      const tagList = await ws.list<Tag>('xman-tag')
      expect(tagList.items.length).toBe(6)
    })
    it('Throws error when access denied', async () => {
      const itemsCall = async () => { await ws.list<Tag>('wrong-collection') }
      await expect(itemsCall).rejects.toThrowError()
    })
  })
  describe('Items', async () => {
    it('Returns null for missing items', async () => {
      const missingItem = await ws.read<Tag>('xman-tag', 'missing-tag-id')
      expect(missingItem).toBeNull()
    })
    it('Returns expected item', async () => {
      const phillyId = 'dyGB3U5F2k3BCM9HIY66'
      const phillyItem = await ws.read<Tag>('xman-tag', phillyId)
      expect(phillyItem).toBeTruthy()
      expect(phillyItem?.id).toBe(phillyId)
      expect(phillyItem?.data.name).toBe('Philadelphia')
      expect(phillyItem?.data.parentTag).toBeInstanceOf(Array)
    })

    it('Returns one related item', async () => {
      const phillyId = 'dyGB3U5F2k3BCM9HIY66'
      const phillyItem = await ws.read<Tag>('xman-tag', phillyId)
      expect(phillyItem).toBeTruthy()
      expect(phillyItem?.data.name).toBe('Philadelphia')
      expect(phillyItem?.data.parentTag).toBeTruthy()

      const destinationsItem = await ws.readReferencedItem<Tag>(phillyItem?.data.parentTag)
      expect(destinationsItem).toBeTruthy()
      expect(destinationsItem?.data.name).toBe('Destinations')

      const noParent = await ws.readReferencedItem<Tag>(destinationsItem?.data.parentTag)
      expect(noParent).toBeNull()
    })

    it('Returns null when no related item', async () => {
      expect(await ws.readReferencedItem(undefined)).toBeNull()
      // @ts-expect-error
      expect(await ws.readReferencedItem(null)).toBeNull()
      expect(await ws.readReferencedItem([])).toBeNull()
      // @ts-expect-error
      expect(await ws.readReferencedItem({})).toBeNull()

      const tableTagId = '30Ey0DhKMw350vEDXOPG'
      const tableTagItem = await ws.read<Tag>('xman-tag', tableTagId)
      expect(tableTagItem).toBeTruthy()
      expect(tableTagItem?.data.name).toBe('Tables')
      expect(tableTagItem?.data.parentTag).toBeTruthy()

      const parentTagItem = await ws.readReferencedItem<Tag>(tableTagItem?.data.parentTag)
      expect(parentTagItem).toBeNull()
    })

    it('Returns all related item', async () => {
      const phillyId = 'dyGB3U5F2k3BCM9HIY66'
      const phillyItem = await ws.read<Tag>('xman-tag', phillyId)
      expect(phillyItem).toBeTruthy()
      expect(phillyItem?.data.name).toBe('Philadelphia')
      expect(phillyItem?.data.parentTag).toBeTruthy()

      const relatedTagItems = await ws.readReferencedItems<Tag>(phillyItem?.data.parentTag)
      expect(relatedTagItems).toBeTruthy()
      expect(relatedTagItems.length).toBe(2) // Because one tag is invalid and another item is invalid
      expect(relatedTagItems[0].data.name).toBe('Destinations')
      expect(relatedTagItems[1].data.name).toBe('Cool cities')

      await expect(() => ws.readReferencedItems<Tag>(phillyItem?.data.parentTag, true)).rejects.toThrowError()
    })

  })
  describe('Images', async () => {
    it('Generates image URL', async () => {
      const imageRefTo234 = { collection: 'xman-assets-image-set', id: '234' }
      const images = await ws.getImage(imageRefTo234)
      expect(images.alt).toBe('Alt for 234')
      expect(Object.keys(images.variations)).toHaveLength(1)
      expect(images.variations.main.src).toBe('https://dummy.cdn/i/dummy-workspace/stg1/234?xacid=clientId')
      expect(images).toMatchObject({
        alt: 'Alt for 234',
        variations: {
          main: { src: 'https://dummy.cdn/i/dummy-workspace/stg1/234?xacid=clientId' }
        }
      })
      const variations: ImageSettings[] = [
        { key: 'default', width: 500 },
        { key: 'medium', width: 750, fit: 'cover' },
        { key: 'full' }
      ]
      const multipleVariations = await ws.getImage(imageRefTo234, variations)
      expect(multipleVariations).toEqual({
        alt: 'Alt for 234',
        variations: {
          default: {
            src: 'https://dummy.cdn/i/dummy-workspace/stg1/234?width=500&xacid=clientId',
            width: 500
          },
          medium: {
            src: 'https://dummy.cdn/i/dummy-workspace/stg1/234?width=750&fit=cover&xacid=clientId',
            width: 750
          },
          full: { src: 'https://dummy.cdn/i/dummy-workspace/stg1/234?xacid=clientId' },
        }
      })
    })
  })
})

interface Tag {
  name: string
  description?: string
  parentTag?: XmanFieldValue.Reference[]
  slug?: string
}
