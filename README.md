# xman-js-sdk
Javascript SDK for accessing [XMan I/O](https://xman.io) data

## Prerequisite
1. Sign-up and create a workspace at https://xman.io
1. Create and publish some content
1. Create an API Client Key in Xman I/O
a. Make sure you add localhost to allowed hosts, if you are doing development on localhost
b. Secret key is required for SSR and Static Generation (Nuxt, NextJS, Gatsby, etc.)

> With globally distributed Cloudflare CDN, we have sub-second response times for content queries. Static generation is **not recommended**.
>
> Server side rendering (SSR) could be used for better SEO.
>
> Examples coming soon...

## Install SDK

```bash
# Add XMan SDK to your project
yarn add @xman.io/xman-js-sdk

```
Or
```
npm install --save @xman.io/xman-js-sdk
```

Then

```javascript
import { getWorkspace } from '@xman.io/xman-js-sdk'
```

## Get Workspace and Stage

### In a web app

```javascript
// Workspace can be a global variable
// Default stage is 'live'
const workspace = getWorkspace('api-client-id', 'workspace-id')

// You can pass a stage name to get a different stage
const workspace = getWorkspace('api-client-id', 'workspace-id', 'pre-production')

// or 

const workspace = getWorkspace('api-client-id', 'workspace-id')
  .stage('pre-production')

```

### Server side access
For server side access pass the the secret key. Make sure the key does not leak to the client.

This step also applies to frameworks that do server side rendering or static page generation, such as: Nuxt, NextJS, Gatsby, etc.

```javascript
let workspace = getWorkspace('api-client-id', 'workspace-id')
.secret('api-secret-key')
```

## Get data from [XMan I/O](https://xman.io)

Use XMan SDK to read collections and items

```javascript
// Get a list of items
const itemsList = await workspace.list('schema-type-id')

// E.g.
const articleList = await workspace.list('xman-article')
// articleList.should.be.an('object')
// articleList.items.should.be.an('array')

// Get one item
const item = await workspace.read('schema-type-id', 'item-id')
// item.should.have.keys('id', 'data', 'version', 'updateTime', 'createTime')

```

## Data Types

### Single Item

```javascript
const item = await workspace.read('xman-property-development', '0123456789abcdefghIJ')
// item.should.be.an('object')
// item.should.have.keys('id', 'data', 'version', 'updateTime', 'createTime')

```

Would return an item or `null`:

```json
  {
    id: "0123456789abcdefghIJ",
    data: {
      coverImage: ImageReferences,
      about: "Centrally located ...",
      description: "Perfectly positioned ...",
      imageGallery: ImageReferences,
      communitiesAround: ItemReferences
    },
    version: 2,
    createdAt: 2019-10-31T13:44:13.625Z,
    updatedAt: 2020-04-02T22:09:40.874Z
  }
 ```

| Result Field | type | description |
| ------|------|------|
| id | `String` | XMan I/O item id |
| item.data | `Object` | Properties managed in XMan I/O. References to Items and Images get special types with helper methods |
| createdAt | `Date` | Timestamp when the item was first published to this stage |
| updatedAt | `Date` | Timestamp when the item was most recently published to this stage | 

### List of Items 

```javascript

const itemsList = await workspace.list('xman-property-development')
// itemsList.should.be.an('object')
// itemsList.items.should.be.an('array')

```

`workspace.list` function

| Input | type | required | description |
| ------|------|------|------|
| collection name | `String` | Yes | |
| listParams | `Object` | No | Sorting and Paging parameters |
| listParams.pageSize | `Number` | No | Default: 12, Max: 24 |
| listParams.orderBy | `String` | No | Data property name, followed by blank space and desc or asc. Default: `updatedAt desc` |
| listParams.pageToken | `String` | If Paging | Token returned by the previous `list()` call in `nextPageToken` field |

Would return an array of items. Array can be empty, but never `undefined` or `null`
| Result Field | type | Can be undefined | description |
| ------|------|------|------|
| nextPageToken | `String` | Yes | If there are more pages, This token can be passed to the next `list()` call |
| items | `Array<Item>` | No | List of items |

```json
{
  items: [
    {
      id: "0123456789abcdefghIJ",
      data: {
        coverImage: ImageReferences,
        about: "Centrally located ...",
        description: "Perfectly positioned ...",
        imageGallery: ImageReferences,
        communitiesAround: ItemReferences
      },
      version: 2,
      createdAt: 2019-10-31T13:44:13.625Z,
      updatedAt: 2020-04-02T22:09:40.874Z
    },
    {
      id: "z9y8x7w6v5u4t3s2r1q0",
      data: {
        coverImage: ImageReferences,
        about: "Centrally located ...",
        description: "Perfectly positioned ...",
        imageGallery: ImageReferences,
        communitiesAround: ItemReferences
      },
      version: 1,
      createdAt: 2019-10-31T13:52:57.109Z,
      updatedAt: 2019-10-31T17:46:37.373Z
    }
  ],
  nextPageToken: "loooooooooo...ooonnnnng...string"
}
```

 ## Helper functions

Specific properties of each item have helper functions attached to them

 ### Item References

An item may reference other items. E.g. An Article may reference an Author. In the above example, property developments are referencing Images (coverImage, imageGallery) and other property developments (communitiesAround)

We can get referenced objects by calling `getReferencedItem()` for single (first) item or `getReferencedItems()` for all items

```javascript
  const propertyDevelopment = await workspace.read('xman-property-development', '0123456789abcdefghIJ')
  const nearbyCommunities = await propertyDevelopment.data.communitiesAround.getReferencedItems()
  // nearbyCommunities.should.be.an('array')
```

### Image Service

XMan.io comes with an Image Delivery Service backed by globally distributed CDN. You can use this service to dynamically render images in specific sizes.

> We use the [Sharp Library](https://sharp.pixelplumbing.com/api-resize) for image operations.
> In the future releases we will support more image manipulation options supported by the Sharp Library


When an item has properties that are of type image (i.e. you selected images in XMan I/O for these properties), you can get the image URLs and alt texts by calling `<<property>>.getImage(imageSettings)` for a single (first) image with given settings (`width` and `height`) or `<<property>>.getImages(imageSettings)` for all images with given settings

```javascript
  const propertyDevelopment = await workspace.read('xman-property-development', '0123456789abcdefghIJ')
  
  // Single image
  const coverImage = await propertyDevelopment.coverImage.getImage({width: 1266, height: 713})
  // Render <img src='${coverImage.url}' alt='${coverImage.altText}'>

  // Set of Images
  const galleryImages200Wide = await propertyDevelopment.imageGallery.getImages({width: 200})

  // galleryImages200Wide.should.be.an('array')
  galleryImages200Wide.forEach(img => {
    // Render <img src='${img.url}' alt='${img.altText}'>
  })
```

### Image cropping

If you specify `width` xor `height`, the aspect ratio is maintained and the original image is scaled

If you specify both `width` and `height`, the original image is focus cropped (if needed) and resized to fit in the box. Focus is set on the region with the highest Shannon Entropy (aka "art direction").

For example:

With only `{ height: 200 }`

![Wide image with 200px height and subject to the right side](docs/7Tkh_h200.jpeg)

With `{ width: 120, height: 200}`

![Narrow image with 120px width and 200px height and subject in focus](docs/7Tkh_w120xh200.jpeg)

Credit: Photo by [Eye for Ebony](https://unsplash.com/@eyeforebony?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText) on [Unsplash](https://unsplash.com/@eyeforebony?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText)

Image service always delivers images in progressive JPEG format (`image/jpeg`)

