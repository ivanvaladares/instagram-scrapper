

import * as React from 'react';
import '../css/LoadingSpinner.scss';


export default class LoadingSpinner extends React.Component<{}> {

  render() {

    return ( <div>
        <div className="loading">
            <div className="loader"></div>
        </div> 
    </div> );
    
  }
}