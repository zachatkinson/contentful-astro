import type {EntryFieldTypes} from "contentful";


export interface ComponentHero{
    contentTypeId: "componentHero",
    fields: {
        title: EntryFieldTypes.Text,
        content: EntryFieldTypes.RichText,
        slug: EntryFieldTypes.Text,
        buttonUrl: EntryFieldTypes.Text,
        buttonText: EntryFieldTypes.Text,
        desktopBackground: EntryFieldTypes.AssetLink,
        mobileBackground: EntryFieldTypes.AssetLink,

    }
}