import type {EntryFieldTypes} from "contentful";

export interface ComponentHero{
    contentTypeId: "componentHero",
    fields: {
        title: EntryFieldTypes.Text,
        background: EntryFieldTypes.AssetLink
    }
}