import * as React from 'react';
import { PrismTheme } from 'prism-react-renderer';

declare class Highlight extends React.Component<{
  Prism: any;
  code: string;
  language: string;
  theme?: PrismTheme;
  children: (props: {
    className: string;
    style: React.CSSProperties;
    tokens: any[][];
    getLineProps: (props: any) => any;
    getTokenProps: (props: any) => any;
  }) => React.ReactNode;
}> {}

export default Highlight;
