"use client";
import React from 'react'
import Appbar from "@/components/appComponents/Appbar";
import Corousal from "@/components/appComponents/homePageComponents/Corousal";
import Symbols from "@/components/appComponents/homePageComponents/Symbols";
import { useAppStore } from '@/store/store';

const HomePage = () => {
    const userId = useAppStore((state) => state.userId)
    const userName = useAppStore((state) => state.userName)

    return (
        <div>
            <Appbar />
            <div className=''>
                {userId && `USER-ID : ${userId} , USER-NAME : ${userName}`} <br />
                <hr />
            <Corousal />
            <Symbols />
            </div>
        </div>
    )
}

export default HomePage