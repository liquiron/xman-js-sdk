import { expect, describe, it, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from "msw"
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
  http.get(`${testUrlPrefix}/requires-server-token`, ({ request }) => {
    if (request.headers.get('XMAN-CLIENT-SECRET') === 'good-token') {
      return HttpResponse.json(mockTags)
    } else {
      return new HttpResponse('Wrong server token', { status: 403 })
    }
  }),
  http.get(`${testUrlPrefix}/requires-bearer`, ({ request }) => {
    if (request.headers.get('Authorization') === 'Bearer ' + m.clientId) {
      return HttpResponse.json(mockTags)
    } else {
      return new HttpResponse('Wrong client ID', { status: 403 })
    }
  }),
  http.get('https://wrong.cdn/*', () => {
    return HttpResponse.text('Not found', { status: 404 })
  }),
  http.get(`${testUrlPrefix}/xman-tag`, () => {
    return HttpResponse.json(mockTags)
  }),
  http.get(`${testUrlPrefix}/wrong-collection*`, () => {
    return HttpResponse.text('This API Client is not allowed to read this collection', { status: 403 })
  }),
  http.get(`${testUrlPrefix}/xman-tag/:tagId`, ({ params }) => {
    const { tagId } = params
    const tag = mockTags.items.find(v => v.id === tagId)
    if (tag) return HttpResponse.json(tag)
    return HttpResponse.text(`Not found 123. Make sure item is published to stage: ${m.stage}`, { status: 404 })
  }),
  http.get(`${testUrlPrefix}/xman-assets-image-set/:imageId`, ({ params }) => {
    const { imageId } = params
    return HttpResponse.json(
      {
        id: imageId,
        data: {
          altText: 'Alt for ' + imageId
        }
      },
    )
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

      //@ts-expect-error testing undefined property
      const emptyRelatedItems = await ws.readReferencedItems<Tag>(phillyItem?.data.nonExistentProperty)
      expect(emptyRelatedItems).toBeTruthy() // emptyRelatedItems = []
      expect(emptyRelatedItems.length).toBe(0)

    })

  })
  describe('Images', async () => {
    it('Fails when incorrect reference', async () => {
      //@ts-expect-error testing wrong arguments
      await expect(() => ws.getImage()).rejects.toThrowError()
      //@ts-expect-error testing wrong arguments
      await expect(() => ws.getImage({ collection: undefined })).rejects.toThrowError()
      //@ts-expect-error testing wrong arguments
      await expect(() => ws.getImage({ collection: 'xman-assets-image-set' })).rejects.toThrowError()
      //@ts-expect-error testing wrong arguments
      await expect(() => ws.getImage({ collection: 'xman-assets-image-set', id: null })).rejects.toThrowError()
      //@ts-expect-error testing wrong arguments
      await expect(() => ws.getImage({ id: '234' })).rejects.toThrowError()
    })
    it('Fails when incorrect ImageSettings', async () => {

      const imageRefTo234 = { collection: 'xman-assets-image-set', id: '234' }
      const missingKeyVariations: ImageSettings[] = [
        { key: 'default', width: 500 },
        //@ts-expect-error testing wrong arguments
        { width: 750, fit: 'cover' },
        { key: 'full' }
      ]
      // Works when no variations are requested
      const imageWithoutVariations = await ws.getImage(imageRefTo234)
      expect(imageWithoutVariations.alt).toBe('Alt for 234')

      // Fails when wrong variations config used
      await expect(() => ws.getImage(imageRefTo234, missingKeyVariations)).rejects.toThrowError()
    })
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
        { key: 'square-profile', width: 400, height: 400 },
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
          "square-profile": {
            src: 'https://dummy.cdn/i/dummy-workspace/stg1/234?width=400&height=400&xacid=clientId',
            width: 400,
            height: 400
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
