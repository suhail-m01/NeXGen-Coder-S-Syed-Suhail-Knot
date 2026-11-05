import type { DiscoveryContext, SourceDocument } from '../types';
import { discoverConfigured, parseConfiguredDocuments } from './_shared';
export const discover = (context: DiscoveryContext) => discoverConfigured(context);
export const parse = (documents: SourceDocument[], context: DiscoveryContext) => parseConfiguredDocuments(documents, context);
