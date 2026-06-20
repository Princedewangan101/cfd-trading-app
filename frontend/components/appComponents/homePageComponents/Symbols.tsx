import Link from 'next/link';
import React from 'react';

const Symbols = () => {
    const symbols = ['ETH/USD', 'SOL/USD', 'BTC/USD'];


    return (
        <>
            {
                symbols.map((s: string) => (
                    <Link key={s} href={`/trade/${s.split("/")[0]}USD`}>
                        <div>
                            {s}
                        </div>
                    </Link>
                ))
            }
        </>
    );
}

export default Symbols