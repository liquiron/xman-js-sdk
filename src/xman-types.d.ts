/**
 * Options for reading a list
 */

export interface ListParams {
  /** in page size. Default 12. Max 24. */
  pageSize?: number;
  /** the `nextPageToken` returned by the previous `list()` call. */
  nextPage?: string;
  /** property path to order by, followed by direction. E.g. `name asc` */
  orderBy?: string;
}

export namespace XmanFieldValue {
  interface Reference {
    collection: string;
    id: string;
    /** Label is cached at the time reference is created. Not updated with the item changes. */
    label?: string;
    altText?: string;
    thumbId?: string;
  }

  interface File {
    contentType: string,
    name: string,
    storageName: string,
    md5Hash: string,
    size: number,
    publicUrl: string
  }

  interface Place {
    rawAddress?: string,
    streetAddress?: string,
    unit?: string,
    city?: string,
    state?: string,
    postal_code?: string,
    country?: string,
    neighborhood?: string,
    latitude: number,
    longitude: number,
    geohashes?: string[],
    geohash?: {
      p_1: string,
      p_2: string,
      p_3: string,
      p_4: string,
      p_5: string,
      p_6: string,
      p_7: string,
      p_8: string,
      p_9: string,
      p_10: string,
      p_11: string,
      p_12: string,
    },
    google_place?: {
      neighborhood: string,
      administrative_area_level_1: string,
      route: string,
      postal_code: string,
      locality: string,
      country: string,
      street_number: string,
      subpremise: string,
      latitude: number,
      longitude: number
    },
  }
}

export interface XmanItem<T> {
  id: string;
  data: T;
  createTime: string;
  updateTime: string;
  version: number;
}

export interface XmanItemsList<T> {
  items: XmanItem<T>[];
  nextPageToken?: string;
}

export interface ImageSettings {
  /**
   * Key to identify the variation of the image.
   * `getImage(s)` will return variations in a map keyed by this key
   * */
  key: string;
  /** Image width. If larger than actual image width, actual width is used */
  width?: number;
  /** Image height. If larger than actual image height, actual height is used */
  height?: number;
  fit?: 'cover' | 'fill' | 'contain';
}

export interface HTMLImageData {
  alt: string;
  variations: {
    [key: string]: {
      src: string;
      width?: number;
      height?: number;
    };
  };
}
