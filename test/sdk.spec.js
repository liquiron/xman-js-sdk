// Mocha has problems with ESM. Just test as CJS
const chai = require('chai')
const { version, getWorkspace } = require('../dist/sdk/xman-js-sdk.cjs')
const pkg = require('../package.json')

chai.should()
const workspace = getWorkspace('86GlmZ2SMaj1LycBqPHk', 'spaceyfi-dummy')
  .cdn('https://staging.xman.live')
  .secret('usFrA8zzM4WP0i0JX1wJZfp6OuOskewq0FDZlxnc')

describe('Xman SDK v' + version, async () => {
  it('Should report correct version', () => {
    version.should.equal(pkg.version)
  })
  it('Should load a collection', async () => {
    const propertyDevelopmentsResponse = await workspace.list(
      'xman-property-development'
    )
    propertyDevelopmentsResponse.should.be.an('object')
    propertyDevelopmentsResponse.should.have.keys('items')
    const propertyDevelopments = propertyDevelopmentsResponse.items
    propertyDevelopments.should.be.an('array')
    propertyDevelopments.length.should.equal(3)
    const firstProperty = propertyDevelopments[0].data
    firstProperty.coverImage.getReferencedItem.should.be.a('function')
    firstProperty.coverImage.getReferencedItems.should.be.a('function')
    firstProperty.coverImage.getImage.should.be.a('function')
    firstProperty.coverImage.getImages.should.be.a('function')
    propertyDevelopments.forEach((dev) => {
      dev.data.coverImage.getReferencedItem.should.be.a('function')
      dev.data.coverImage.getReferencedItems.should.be.a('function')
      dev.data.coverImage.getImage.should.be.a('function')
      dev.data.coverImage.getImages.should.be.a('function')
    })
  })

  it('Should load an item', async () => {
    const propertyDevelopment = await workspace.read('xman-property-development', '0JrXhW8ariV60qAOARF5')
    propertyDevelopment.should.have.keys('id', 'data', 'version', 'updateTime', 'createTime')
  })

  it('Item should have helper methods', async () => {
    const propertyDevelopment = await workspace.read('xman-property-development', '0JrXhW8ariV60qAOARF5')
    propertyDevelopment.data.communitiesAround.getReferencedItem.should.be.a('function')
    propertyDevelopment.data.communitiesAround.getReferencedItems.should.be.a('function')
    propertyDevelopment.data.coverImage.getReferencedItem.should.be.a('function')
    propertyDevelopment.data.coverImage.getReferencedItems.should.be.a('function')
    propertyDevelopment.data.coverImage.getImage.should.be.a('function')
    propertyDevelopment.data.coverImage.getImages.should.be.a('function')
  })

  it('Should load a single referenced items', async () => {
    const propertyDevelopment = await workspace.read('xman-property-development', '0JrXhW8ariV60qAOARF5')

    const community = await propertyDevelopment.data.communitiesAround.getReferencedItem()
    community.should.be.an('object')
    community.should.have.keys('id', 'data', 'version', 'updateTime', 'createTime')
    community.data.coverImage.getReferencedItem.should.be.a('function')
    community.data.coverImage.getReferencedItems.should.be.a('function')
    community.data.coverImage.getImage.should.be.a('function')
    community.data.coverImage.getImages.should.be.a('function')
  })

  it('Should load a list of referenced items', async () => {
    const propertyDevelopment = await workspace.read('xman-property-development', '0JrXhW8ariV60qAOARF5')

    let nearbyCommunities = await propertyDevelopment.data.communitiesAround.getReferencedItems()
    nearbyCommunities.should.be.an('array')
    nearbyCommunities.length.should.equal(3)
    nearbyCommunities.forEach(community => {
      community.should.have.keys('id', 'data', 'version', 'updateTime', 'createTime')
      community.data.coverImage.getReferencedItem.should.be.a('function')
      community.data.coverImage.getReferencedItems.should.be.a('function')
      community.data.coverImage.getImage.should.be.a('function')
      community.data.coverImage.getImages.should.be.a('function')
    })
  })

  it('Images should generate proper CDN URLs for a single image', async () => {
    const propertyDevelopment = (await workspace.read('xman-property-development', '0JrXhW8ariV60qAOARF5')).data
    const coverImage = await propertyDevelopment.coverImage.getImage()
    coverImage.should.be.an('object')
    coverImage.should.have.keys('altText', 'url')
    const imagePathFormat = /^https:\/\/staging.xman.live\/i\/spaceyfi-dummy\/live\/\b[0-9a-zA-Z]{20}\b\?xacid=\b[0-9a-zA-Z]{20}\b$/
    coverImage.url.should.match(imagePathFormat)
    const coverImage200Wide = await propertyDevelopment.imageGallery.getImage({width: 200})
    coverImage200Wide.should.be.an('object')
    coverImage200Wide.should.have.keys('altText', 'url')
    const imagePathFormatWithWidth = /^https:\/\/staging.xman.live\/i\/spaceyfi-dummy\/live\/\b[0-9a-zA-Z]{20}\b\?width=200&xacid=\b[0-9a-zA-Z]{20}\b$/
    coverImage200Wide.url.should.match(imagePathFormatWithWidth)
  })

  it('Images should generate proper CDN URLs for image collections', async () => {
    const propertyDevelopment = (await workspace.read('xman-property-development', '0JrXhW8ariV60qAOARF5')).data
    const galleryImages = await propertyDevelopment.imageGallery.getImages()
    galleryImages.should.be.an('array')
    galleryImages.length.should.equal(6)
    const imagePathFormat = /^https:\/\/staging.xman.live\/i\/spaceyfi-dummy\/live\/\b[0-9a-zA-Z]{20}\b\?xacid=\b[0-9a-zA-Z]{20}\b$/
    galleryImages.forEach(img => {
      img.url.should.match(imagePathFormat)
    })
    const galleryImages200Wide = await propertyDevelopment.imageGallery.getImages({width: 200})
    galleryImages200Wide.should.be.an('array')
    galleryImages200Wide.length.should.equal(6)
    const imagePathFormatWithWidth = /^https:\/\/staging.xman.live\/i\/spaceyfi-dummy\/live\/\b[0-9a-zA-Z]{20}\b\?width=200&xacid=\b[0-9a-zA-Z]{20}\b$/
    galleryImages200Wide.forEach(img => {
      img.url.should.match(imagePathFormatWithWidth)
    })
  })
})

