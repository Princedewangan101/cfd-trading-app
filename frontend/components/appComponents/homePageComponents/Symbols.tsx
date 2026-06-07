import Link from 'next/link';
import React from 'react'

const Symbols = () => {
    const symbols = ['ETHUSD', 'SOLUSD', 'BTCUSD'];

    return (
        <>
            {
                symbols.map((s: string) => (
                    <Link key={s} href={`/trade/${s}`}>
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