"use client";
import { authethicate } from '@/app/utils/authenthicate';
import { handleError } from '@/app/utils/errorHandler';
import { toastError } from '@/lib/toast';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react'
import { Suspense } from 'react'

const AuthPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const authPage: "signin" | "signup" = searchParams.get("mode") === "signin" ? "signin" : "signup";

    function changeAuthPage() {
        const nextMode = authPage === "signup" ? "signin" : "signup";
        router.push(`/auth?mode=${nextMode}`);
    }

    async function handleAuthenthication(e: React.SyntheticEvent<HTMLFormElement>) {
        try {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)

            const serverResponse = await authethicate(formData, authPage);

            console.log("serverResponse :", serverResponse);

            if (!serverResponse.success) {
                toastError(`${serverResponse.message}`);
            }
            if (serverResponse.success) {
                router.push("/")
            }

        } catch (error) {
            const errorMessage = handleError(error)
            toastError(errorMessage);
        }
    }



    return (
        <main className='w-screen h-screen flex items-center justify-center'>

            <div className="boxShadow flex flex-col justify-center w-full max-w-80 rounded-xl px-6 py-8 border bg-zinc border-border text-white text-sm">
                <h2 className="text-2xl font-semibold">{authPage === "signup" ? "Sign Up" : "Log in"}</h2>
                <form onSubmit={handleAuthenthication} className="mt-8">
                    {authPage === "signup" &&
                        <>
                            <label htmlFor="userName" className="block mb-1 font-medium text-slate-300">User name</label>
                            <input required type="text" id="userName" name="userName" placeholder="Alibaba" className="w-full p-2 mb-3 bg-zinc-900/70 rounded-md focus:outline-none" />

                        </>
                    }

                    <label htmlFor="email" className="block mb-1 font-medium text-slate-300">Email address</label>
                    <input required type="email" id="email" name="email" placeholder="alibaba@gmail.com" className="w-full p-2 mb-3 bg-zinc-900/70 rounded-md focus:outline-none" />

                    <label htmlFor="password" className="block mb-1 font-medium text-slate-300">Password</label>
                    <input required type="password" id="password" name="password" placeholder="911" className="w-full p-2 mb-3 bg-secondary rounded-md focus:outline-none" />
                    {authPage === "signin" &&
                        <>
                            <div className="text-right text-xs">
                                <Link href="#" className="font-medium text-indigo-600 hover:text-indigo-500">Forgot password?</Link>
                            </div>
                        </>
                    }

                    <button type="submit" className="w-full mt-6 mb-4 px-4 py-2.5 font-medium text-white bg-ind rounded-md hover:bg-ind-dark focus:outline-none">
                        {authPage === "signup" ? "Sign Up" : "Log in"}
                    </button>

                    <p className='text-xs'>{authPage === "signup" ? "Already have an account ? " : "Want to create new ? "}
                        <span className='cursor-pointer' onClick={changeAuthPage}>{authPage === "signup" ? "Log in" : "Sign Up"} </span>
                    </p>
                </form>
            </div>
        </main>
    )
}

export default function AuthPageWrapper() {
    return (
        <Suspense>
            <AuthPage />
        </Suspense>
    )
}