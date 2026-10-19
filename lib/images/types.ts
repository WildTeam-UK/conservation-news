export type EditorialImageCredit = {
  provider: 'unsplash' | 'manual';
  source_id: string;
  creator_name: string;
  creator_url: string;
  source_name: string;
  source_url: string;
  licence_name: string;
  licence_url: string;
  download_location: string;
  illustrative: boolean;
  colour?: string;
};

export type UnsplashImageCandidate = {
  id: string;
  image_url: string;
  thumbnail_url: string;
  alt_text: string;
  description: string;
  colour: string;
  width: number;
  height: number;
  credit: EditorialImageCredit;
};
