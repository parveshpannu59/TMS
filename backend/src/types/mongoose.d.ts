import { Document, Model } from 'mongoose';

declare module 'mongoose' {
  interface Document {
    model?: Model<any>;
  }
}
