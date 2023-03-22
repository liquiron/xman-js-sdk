# xman-js-sdk
Javascript SDK for accessing [XMan I/O](https://xman.io) data

## Prerequisite
1. Sign-up and create a workspace at https://xman.io
1. Create and publish some content
1. Create an API Client Key in Xman I/O
a. Make sure you add localhost to allowed hosts, if you are doing development on localhost
b. Secret key is required for SSR and Static Generation (Nuxt, NextJS, Gatsby, etc.)
1. Generate and copy Types for your API. Paste these types in xman.d.ts file in your project and add "xman.d.ts" entry to your tsconfig.json > "include" section. This will provide IntelliSense in the IDE/editor you are using.

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

```typescript
// Get a list of items
const itemsList = await workspace.list<T>('collection-id', optionalListParams)
// returns
interface XmanItemsList<T> {
  items: XmanItem<T>[],
  nextPageToken?: string
}
// Where
interface XmanItem<T> {
  id: string
  data: T,
  createTime: string,
  updateTime: string,
  version: number
}

// E.g.
const articleList = await workspace.list<Article>('xman-article')
// articleList.should.be.an('object')
// articleList.items.should.be.an('array')

// Get one item
const item = await workspace.read<T>('collection-id', 'item-id')
// item.should.have.keys('id', 'data', 'version', 'updateTime', 'createTime')

```
### Single Item

```javascript
const item = await workspace.read<PropertyDevelopment>('xman-property-development', '0123456789abcdefghIJ')
// item.should.be.an('object')
// item.should.have.keys('id', 'data', 'version', 'updateTime', 'createTime')

```

Would return an item or `null`:

```json
  {
    "id": "0123456789abcdefghIJ",
    "data": {
      "coverImage": [{ 
        "collection": "xman-assets-image-set",
        "id": "image-id"
      }],
      "about": "Centrally located ...",
      "description": "Perfectly positioned ...",
      "imageGallery": [
        {
          "collection": "xman-assets-image-set",
          "id": "image-id"
        },
        {
          "collection": "xman-assets-image-set",
          "id": "image-id"
        }
      ],
      "communitiesAround": [{"collection": "xman-property-development", "id": "another-property-id"}]
    },
    "version": 2,
    "createTime": "2019-10-31T13:44:13.625Z",
    "updateTime": "2020-04-02T22:09:40.874Z"
  }
 ```

| Result Field | type | description |
| ------|------|------|
| id | `string` | XMan I/O item id |
| item.data | `Object` | Properties managed in XMan I/O. References to Items and Images get special types with helper methods |
| createTime | `string` | Timestamp when the item was first published to this stage |
| updateTime | `string` | Timestamp when the item was most recently published to this stage | 

### List of Items 

````typescript

interface ListParams {
  /** in page size. Default 12. Max 24. */
  pageSize?: number,
  /** the `nextPageToken` returned by the previous `list()` call. */
  nextPage?: string,
  /** property path to order by, followed by direction. E.g. `name asc` */
  orderBy?: string
}

interface XmanItemsList<T> {
  items: XmanItem<T>[],
  nextPageToken?: string
}

list<T> (collection: string, listParams?: ListParams): Promise<XmanItemsList<T>>;

````

`workspace.list` function

| Input | type | required | description |
| ------|------|------|------|
| collection name | `String` | Yes | |
| listParams | `Object` | No | Sorting and Paging parameters |
| listParams.pageSize | `Number` | No | Default: 12, Max: 24 |
| listParams.orderBy | `String` | No | Data property name, followed by blank space and desc or asc. Default: `updateTime desc` |
| listParams.pageToken | `String` | If Paging | Token returned by the previous `list()` call in `nextPageToken` field |

Would return an array of items. Array can be empty, but never `undefined` or `null`
| Result Field | type | Can be undefined | description |
| ------|------|------|------|
| nextPageToken | `String` | Yes | If there are more pages, This token can be passed to the next `list()` call |
| items | `Array<Item>` | No | List of items |

```json
{
  "items": [
    {
      "id": "0123456789abcdefghIJ",
      "data": {
        "coverImage": { "collection": "xman-assets-image-set", "id": "image-id" },
        "about": "Centrally located ...",
        "description": "Perfectly positioned ...",
        "imageGallery": { "collection": "xman-assets-image-set", "id": "image-id" },
        "communitiesAround": [{"collection": "xman-property-development", "id": "another-property-id"}]
      },
      "version": 2,
      "createTime": "2019-10-31T13:44:13.625Z",
      "updateTime": "2020-04-02T22:09:40.874Z"
    },
    {
      "id": "z9y8x7w6v5u4t3s2r1q0",
      "data": {
        "coverImage": { "collection": "xman-assets-image-set", "id": "image-id" },
        "about": "Centrally located ...",
        "description": "Perfectly positioned ...",
        "imageGallery": { "collection": "xman-assets-image-set", "id": "image-id" },
        "communitiesAround": []
      },
      "version": 1,
      "createTime": "2019-10-31T13:52:57.109Z",
      "updateTime": "2019-10-31T17:46:37.373Z"
    }
  ],
  "nextPageToken": "loooooooooo...ooonnnnng...string"
}
```

 ### Item References

An item may reference other items. E.g. An Article may reference an Author. In the above example, property developments are referencing Images (coverImage, imageGallery) and other property developments (communitiesAround)

We can get referenced objects by calling `getReferencedItem()` for single (first) item or `getReferencedItems()` for all items

```typescript
  const propertyDevelopment = await workspace.read<PropertyDevelopment>('xman-property-development', '0123456789abcdefghIJ')
  const nearbyCommunities = await workspace.getReferencedItems<PropertyDevelopment>(propertyDevelopment?.data.communitiesAround)
  // nearbyCommunities.should.be.an('array')
```

### Images

XMan.io comes with an Image Delivery Service backed by globally distributed Content Delivery Network (CDN). You can use this service to dynamically render images in specific sizes.

> We use the [Sharp Library](https://sharp.pixelplumbing.com/api-resize) for image operations.
> In the future releases we will support more image manipulation options supported by the Sharp Library


You can get alt text and the CDN URLs for image variations with specific settings (`width` and `height`) by calling `workspace.getImage` for a single (first) image or `workspace.getImages` for a set of images. The results can be used in a `<picture>` tag or an `<img>` tag.

Example:
```javascript
  const propertyDevelopment = await workspace.read('xman-property-development', '0123456789abcdefghIJ')
  
  // Single image; no cropping
  const coverImage = await workspace.getImage(propertyDevelopment.coverImage)
  // When no settings are passed, the default variation is named 'main'
  // Render <img src='${coverImage.variations.main?.src}' alt='${coverImage.alt}'>

  // Single image
  const coverImage = await workspace.getImage(propertyDevelopment.coverImage, [{key: 'default', width: 1266, height: 713}])
  // Render <img src='${coverImage.variations.default?.src}' alt='${coverImage.alt}'>

// Single image, many responsive variations
  const variations: ImageSettings[] = [
    { key: 'default', width: 500 },
    { key: 'medium', width: 750, fit: 'cover' },
    { key: 'full' }
  ]
  const coverImage = await workspace.getImage(propertyDevelopment.coverImage, variations)
  // Render:
  //  <picture>
  //    <source srcset="${coverImage.full.src}" media="(min-width: 800px)" />
  //    <source srcset="${coverImage.medium.src}" media="(min-width: 550px)" />
  //    <img src="${coverImage.default.src}" alt="${coverImage.alt}" />
  //  </picture>


  // Set of Images, with responsive variations
  const galleryImages = await workspace.getImages(propertyDevelopment.imageGallery, variations)

  galleryImages.forEach(img => {
  //  <picture>
  //    <source srcset="${img.full.src}" media="(min-width: 800px)" />
  //    <source srcset="${img.medium.src}" media="(min-width: 550px)" />
  //    <img src="${img.default.src}" alt="${img.alt}" />
  //  </picture>
  })
```

### Image cropping

If you specify either `width` or `height` (but not both), the aspect ratio is maintained and the original image is scaled. The image is never scaled up beyond the original width and height. We may do this in later releases.

If you specify both `width` and `height`, the original image is focus cropped (if needed) and resized to fit in the box. Focus is set on the region with the highest Shannon Entropy (aka "art direction").

For example:

With only `{ height: 200 }`

![Wide image with 200px height and subject to the right side](docs/7Tkh_h200.jpeg)

With `{ width: 120, height: 200}`

![Narrow image with 120px width and 200px height and subject in focus](docs/7Tkh_w120xh200.jpeg)

Credit: Photo by [Eye for Ebony](https://unsplash.com/@eyeforebony?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText) on [Unsplash](https://unsplash.com/@eyeforebony?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText)

You can also choose the focus point manually in XMan.io.


![Demo of selecting focus in XMan.io](docs/xman-select-focus.gif)


Image service always delivers images in progressive JPEG format (`image/jpeg`)

