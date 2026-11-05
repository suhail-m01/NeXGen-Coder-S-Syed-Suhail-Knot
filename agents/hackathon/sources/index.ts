import type { SourceConnector } from '../types';
import * as brave from './brave';
import * as devfolio from './devfolio';
import * as devpost from './devpost';
import * as dorahacks from './dorahacks';
import * as eventbrite from './eventbrite';
import * as hackerEarth from './hackerearth';
import * as hack2skill from './hack2skill';
import * as insider from './insider';
import * as luma from './luma';
import * as meetup from './meetup';
import * as mlh from './mlh';
import * as serpapi from './serpapi';
import * as tavily from './tavily';
import * as townscript from './townscript';
import * as unstop from './unstop';

export const CONNECTORS: Record<string, SourceConnector> = {
  brave, devfolio, devpost, dorahacks, eventbrite, hackerearth: hackerEarth,
  hack2skill, insider, luma, meetup, mlh, serpapi, tavily, townscript, unstop,
};
