import wallet from "../../turbin3-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { readFile } from "fs/promises"

// Create a devnet connection
const umi = createUmi('https://turbine-solanad-4cde.devnet.rpcpool.com/168dd64f-ce5e-4e19-a836-f6482ad6b396');

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader({address: "https://devnet.irys.xyz/"}));

umi.use(signerIdentity(signer));

(async () => {
    try {
        //1. Load image
        const image = await readFile('./cluster1/assets/generug.png');

        //2. Convert image to generic file.
        const genericFile = createGenericFile(
            image,
            'test.png',
            {
                'contentType': 'image/png'
            }
        );

        //3. Upload image
        const upload = await umi.uploader.upload([genericFile]);

        let imageUrl = upload[0];

        console.log("Your image URI: ", imageUrl);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();
