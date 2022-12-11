type RootLayoutProps = {
    children: React.ReactNode;
};

export default function Layout({ children }: RootLayoutProps) {
    return (
        <html lang="en">
            <head>
                <title>Raptor</title>
                <link rel="icon" href="/raptor-logo.svg" />
            </head>
            <body>{children}</body>
        </html>
    );
}
