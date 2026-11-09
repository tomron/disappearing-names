import { render } from 'preact';
import { App } from './App';
import { embed } from './router';
import './app.css';

document.documentElement.classList.toggle('embed', embed);
render(<App />, document.getElementById('app')!);
