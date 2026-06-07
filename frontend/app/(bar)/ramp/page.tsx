"use client";
import axios from 'axios';
import React from 'react'
import { authethicate } from '@/app/utils/authenthicate';
import { handleError } from '@/app/utils/errorHandler';
import { toastConfig } from '@/lib/toastConfig';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { config } from '@/lib/config';

const page = () => {

  const router = useRouter();
  const [isDeposit, setIsDeposit] = React.useState<boolean>(true);


  async function handleRamp(e: React.SyntheticEvent<HTMLFormElement>) {
    try {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)

      const payload = Object.fromEntries(formData.entries());

      if (Number(payload.amount) < 0) {
        return toast.error("Amount can't be negative !", toastConfig);
      }

      if (Number(payload.amount) === 0) {
        return toast.error("Amount must be greater than 0 !", toastConfig);
      }

      const serverResponse = await axios.post(`http://localhost:5000/api/${isDeposit ? "deposit" : "withdraw"}`, { ...payload, ikey: crypto.randomUUID() }, config)

      console.log(`> serverResponse (/api/${isDeposit ? "deposit" : "withdraw"}) :`, serverResponse);

      if (serverResponse.data.success) {
        return toast.error("Deposit Successfull", toastConfig);
      }

    } catch (error: any) {
      const errorMessage = handleError(error)
      toast.error(errorMessage, toastConfig);
    }
  }



  return (
    <main className='w-screen h-screen flex items-center justify-center'>


      {/* FORM */}
      <div className=" flex flex-col justify-center w-full max-w-80 rounded-xl px-6 py-8 border bg-zinc border-border text-white text-sm">

        <form onSubmit={handleRamp} className="mt-8">

          {/* RAMP TOUGGLER */}
          <div className="flex w-full mb-3 bg-zinc-900/70 rounded-md focus:outline-none">
            <p onClick={() => setIsDeposit(true)} className={`w-full text-center p-2 rounded-md ${isDeposit  && "bg-zinc-800"}`}>Deposit</p>
            <p onClick={() => setIsDeposit(false)} className={`w-full text-center p-2 rounded-md ${!isDeposit  && "bg-zinc-800"}`} >Withdraw</p>
          </div>


          <label htmlFor="amount" className="block mb-1 font-medium text-slate-300">Amount</label>
          <input required type="number" id="amount" name="amount" placeholder="25500" className="w-full p-2 bg-secondary rounded-xl focus:outline-none" />

          <button type="submit" className="w-full mt-6 mb-4 px-4 py-2.5 font-medium text-white bg-ind rounded-xl hover:bg-ind-dark focus:outline-none">
            {isDeposit ? "DEPOSIT" : "WITHDRAW"}
          </button>

        </form>
      </div>
    </main>
  )
}

export default page