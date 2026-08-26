import React from 'react';
import SharedHeader from './SharedHeader.jsx';

export default function HomePage(){
  return <div className="home-page-shell">
    <SharedHeader/>
    <main className="home-empty-area"/>
  </div>;
}
