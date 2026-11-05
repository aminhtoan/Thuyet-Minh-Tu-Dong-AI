export interface Language{id:string;code:string;name:string;nativeName:string;isActive:boolean;voiceCount:number}
export type VoiceGender='FEMALE'|'MALE'|'NEUTRAL';
export interface Voice{id:string;languageId:string;provider:string;providerVoiceId:string;name:string;gender:VoiceGender;description:string;previewUrl?:string;isActive:boolean;createdAt:string;updatedAt:string}
export type LogCategory='AUTH'|'USER'|'PROJECT'|'MEDIA'|'TRANSCRIPT'|'TRANSLATION'|'VOICE'|'PROCESSING'|'ADMIN'|'SYSTEM';
export type LogRole='CUSTOMER'|'ADMIN';
export interface ActivityLog{id:string;userId:string;userName:string;userRole:LogRole|'UNKNOWN';action:string;category:LogCategory;entityType:string;entityId:string;entityName:string;description:string;createdAt:string}
export interface SystemSettings{editable:false;environment:string;upload:{maxSizeMb:number;supportedMediaTypes:string[]};authentication:{accessTokenTtl:string;refreshTokenTtl:string};processing:{mode:string;ffmpegBinarySource:string;ffprobeBinarySource:string;sttProviderConfigured:boolean;translationProviderConfigured:boolean;ttsProviderConfigured:boolean}}
export type LanguageInput=Omit<Language,'id'>;export type VoiceInput=Omit<Voice,'id'|'createdAt'|'updatedAt'>;
