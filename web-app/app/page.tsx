import Head from 'next/head';
import Image from 'next/image';

export default function App() {
    // this home page has a three column layout like twitter
    return (
        <div className="p-0">
            <img src="/raptor-logo.svg" alt="Raptor Logo" className="w-64" />
        </div>
    );
}
