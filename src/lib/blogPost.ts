import type {EntryFieldTypes} from "contentful";

export interface BlogPost{
    contentTypeId: "blogPost",
    fields: {
        title: EntryFieldTypes.Text,
        content: EntryFieldTypes.RichText,
        date: EntryFieldTypes.Date,
        description: EntryFieldTypes.Text,
        slug: EntryFieldTypes.Text
    }
}